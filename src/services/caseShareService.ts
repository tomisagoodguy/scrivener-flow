import type { SupabaseClient } from '@supabase/supabase-js';
import type { CaseShare } from '@/types/caseShare';
import type { ChatUser } from '@/types/chat';
import { listChatUsers } from '@/lib/chat/chatService';

// `case_shares` 尚未存在於 `src/types/supabase.ts`（migration 待套用後才會 regenerate），
// 比照 `src/services/caseService.ts` 使用未帶 Database 泛型的 SupabaseClient。
type Client = SupabaseClient;

const UNIQUE_VIOLATION = '23505';

/**
 * Supabase 拋出的是純物件 PostgrestError，不是 Error 實例；直接 `throw error`
 * 會讓呼叫端的 `err instanceof Error` guard 失效、吞掉真正的錯誤訊息。
 */
function toError(error: { message: string } | null, fallback: string): Error {
    return new Error(error?.message || fallback);
}

/**
 * 將案件唯讀分享給指定使用者。重複分享同一人（UNIQUE (case_id, shared_with) 違反）
 * 視為成功，不噴錯誤給使用者；其他錯誤（例如非案件擁有者觸發 RLS 拒絕）照常拋出。
 */
export async function addShare(
    supabase: Client,
    caseId: string,
    sharedWithUserId: string,
    sharedByUserId: string
): Promise<void> {
    const { error } = await supabase.from('case_shares').insert({
        case_id: caseId,
        shared_with: sharedWithUserId,
        shared_by: sharedByUserId,
    });

    if (error && error.code !== UNIQUE_VIOLATION) {
        throw toError(error, '分享案件失敗');
    }
}

/** 移除案件的分享。非案件擁有者呼叫時 RLS 會拒絕刪除，錯誤原樣拋出。 */
export async function removeShare(supabase: Client, caseId: string, sharedWithUserId: string): Promise<void> {
    const { error } = await supabase
        .from('case_shares')
        .delete()
        .eq('case_id', caseId)
        .eq('shared_with', sharedWithUserId);

    if (error) throw toError(error, '移除分享失敗');
}

/**
 * 分享對象駁回自己的分享（狀態式軟移除，不刪除列）。只能由分享對象本人呼叫；
 * RLS 限制只能更新 `shared_with = auth.uid()` 的列，呼叫端只會傳自己的 id，
 * 0 rows affected 不視為錯誤。
 */
export async function rejectShare(supabase: Client, caseId: string, sharedWithUserId: string): Promise<void> {
    const { error } = await supabase
        .from('case_shares')
        .update({ status: 'rejected', rejected_at: new Date().toISOString() })
        .eq('case_id', caseId)
        .eq('shared_with', sharedWithUserId);

    if (error) throw toError(error, '駁回分享失敗');
}

/** 案件擁有者重新分享（把被駁回的列改回 active）。非擁有者呼叫時 RLS 會拒絕更新，錯誤原樣拋出。 */
export async function reactivateShare(supabase: Client, caseId: string, sharedWithUserId: string): Promise<void> {
    const { error } = await supabase
        .from('case_shares')
        .update({ status: 'active', rejected_at: null })
        .eq('case_id', caseId)
        .eq('shared_with', sharedWithUserId);

    if (error) throw toError(error, '重新分享失敗');
}

/** 列出某案件目前的分享名單。 */
export async function listShares(supabase: Client, caseId: string): Promise<CaseShare[]> {
    const { data, error } = await supabase.from('case_shares').select('*').eq('case_id', caseId);
    if (error) throw toError(error, '取得分享名單失敗');
    return data ?? [];
}

/**
 * 搜尋可分享的使用者。比照 in-app-chat 的使用者選擇器設計哲學，
 * 重用 `list_chat_users` RPC（同一份「公司內活躍使用者」清單），
 * 在前端依 email／姓名子字串過濾。
 */
export async function searchShareableUsers(supabase: Client, query: string): Promise<ChatUser[]> {
    const users = await listChatUsers(supabase);
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return users;

    return users.filter((user) => {
        const email = user.email?.toLowerCase() ?? '';
        const name = user.full_name?.toLowerCase() ?? '';
        return email.includes(trimmed) || name.includes(trimmed);
    });
}

/**
 * 計算案件的 `isOwnedByCurrentUser` 衍生欄位。案件的 `user_id` 為 `null`/`undefined`
 * 時視為非擁有（RLS 擴充後案件清單也會回傳被分享案件，其 `user_id` 恆不等於目前使用者）。
 */
export function computeIsOwnedByCurrentUser(caseUserId: string | null | undefined, currentUserId: string): boolean {
    return caseUserId === currentUserId;
}

/** 姓名無法解析時的通用文字。刻意不落回 email（前綴亦不用），避免對被分享者暴露分享者帳號資訊。 */
export const UNRESOLVED_SHARER_LABEL = '同事分享給你';

/**
 * 把分享者 user id 解析成「OO 分享給你」文字，只使用 `full_name`，不使用 email
 * （即使 email 可解析也不當 fallback，與 `chatDisplayName()` 的聊天室情境刻意不同）。
 * 找不到對應使用者，或使用者沒有設定 `full_name`，一律回傳通用 fallback 文字。
 */
export function resolveSharedByLabel(sharedByUserId: string | undefined, users: ChatUser[]): string {
    if (!sharedByUserId) return UNRESOLVED_SHARER_LABEL;
    const matched = users.find((u) => u.id === sharedByUserId);
    if (!matched?.full_name) return UNRESOLVED_SHARER_LABEL;
    return `${matched.full_name} 分享給你`;
}

/** 單一被分享者姓名無法解析時的通用文字（不落回 email）。 */
export const UNRESOLVED_RECIPIENT_NAME = '同事';

/**
 * 把案件擁有者端的分享名單解析成「已分享給：A、B」文字，只使用 `full_name`，
 * 不使用 email；名單為空時回傳空字串（呼叫端應以空字串代表不顯示標記）。
 */
export function resolveSharedWithLabel(sharedWithUserIds: string[], users: ChatUser[]): string {
    if (sharedWithUserIds.length === 0) return '';
    const names = sharedWithUserIds.map((id) => {
        const matched = users.find((u) => u.id === id);
        return matched?.full_name || UNRESOLVED_RECIPIENT_NAME;
    });
    return `已分享給：${names.join('、')}`;
}
