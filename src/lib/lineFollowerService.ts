import { getAdminClient } from '@/lib/supabase/service';

// line_followers 尚未納入 Supabase 型別定義，暫以 unknown 規避
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const lineFollowers = () => (getAdminClient() as any).from('line_followers');

/** 儲存或更新好友 User ID；unfollow 後 re-follow 時重新啟用 */
export async function upsertFollower(userId: string, displayName: string | null): Promise<void> {
    const { error } = await lineFollowers().upsert(
        { user_id: userId, display_name: displayName, is_active: true, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
    );
    if (error) throw new Error(`upsertFollower 失敗: ${error.message}`);
}

/** 將好友標記為非活躍（退好友） */
export async function deactivateFollower(userId: string): Promise<void> {
    const { error } = await lineFollowers()
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
    if (error) throw new Error(`deactivateFollower 失敗: ${error.message}`);
}

/** 列出所有活躍好友（顯示名稱 + 加入時間） */
export async function listActiveFollowers(): Promise<{ display_name: string | null; created_at: string }[]> {
    const { data, error } = await lineFollowers()
        .select('display_name, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

    if (error) throw new Error(`listActiveFollowers 失敗: ${error.message}`);
    return (data as { display_name: string | null; created_at: string }[]) ?? [];
}

/** 依顯示名稱（case-insensitive）查詢活躍好友的 user_id；找不到回傳 null */
export async function findFollowerByDisplayName(displayName: string): Promise<string | null> {
    const { data, error } = await lineFollowers()
        .select('user_id')
        .eq('is_active', true)
        .ilike('display_name', displayName)
        .limit(1)
        .maybeSingle();

    if (error) throw new Error(`findFollowerByDisplayName 失敗: ${error.message}`);
    return (data as { user_id: string } | null)?.user_id ?? null;
}
