import { getAdminClient } from '@/lib/supabase/service';

/** 儲存或更新好友 User ID；unfollow 後 re-follow 時重新啟用 */
export async function upsertFollower(userId: string, displayName: string | null): Promise<void> {
    const supabase = getAdminClient();
    const { error } = await supabase
        .from('line_followers')
        .upsert(
            { user_id: userId, display_name: displayName, is_active: true, updated_at: new Date().toISOString() },
            { onConflict: 'user_id' }
        );
    if (error) throw new Error(`upsertFollower 失敗: ${error.message}`);
}

/** 將好友標記為非活躍（退好友） */
export async function deactivateFollower(userId: string): Promise<void> {
    const supabase = getAdminClient();
    const { error } = await supabase
        .from('line_followers')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
    if (error) throw new Error(`deactivateFollower 失敗: ${error.message}`);
}

/** 依顯示名稱（case-insensitive）查詢活躍好友的 user_id；找不到回傳 null */
export async function findFollowerByDisplayName(displayName: string): Promise<string | null> {
    const supabase = getAdminClient();
    const { data, error } = await supabase
        .from('line_followers')
        .select('user_id')
        .eq('is_active', true)
        .ilike('display_name', displayName)
        .limit(1)
        .maybeSingle();

    if (error) throw new Error(`findFollowerByDisplayName 失敗: ${error.message}`);
    return data?.user_id ?? null;
}
