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
