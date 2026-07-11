'use server';

import { createClient } from '@/lib/supabase/server';
import type { EisenhowerMatrixData } from '@/components/dashboard/eisenhower/types';
import { parseMatrix } from '@/components/dashboard/eisenhower/chipUtils';

/** 讀取目前使用者的矩陣設定；無列、欄位為空或為 v1 舊格式時由 parseMatrix 正規化 */
export async function getEisenhowerMatrix(): Promise<EisenhowerMatrixData> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return parseMatrix(null);

    const { data, error } = await supabase
        .from('user_settings')
        .select('eisenhower_matrix')
        .eq('user_id', user.id)
        .maybeSingle();

    if (error) throw new Error(`讀取矩陣設定失敗：${error.message}`);
    return parseMatrix(data?.eisenhower_matrix);
}

/** 保存目前使用者的矩陣設定（只覆寫 eisenhower_matrix 欄位，一律寫成 v2 格式） */
export async function saveEisenhowerMatrix(
    matrix: EisenhowerMatrixData
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: '未登入' };

    const { error } = await supabase.from('user_settings').upsert(
        {
            user_id: user.id,
            eisenhower_matrix: parseMatrix(matrix),
            updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
    );

    if (error) return { success: false, error: error.message };
    return { success: true };
}
