'use server';

import { createClient } from '@/lib/supabase/server';
import {
    CasesLayoutSchema,
    DEFAULT_CASES_LAYOUT,
    type CasesLayout,
} from '@/domain/cases/layoutTypes';

/** 缺席於已儲存版面的 widget id（例如新上線的板塊），補為可見並接在既有最大 order 之後 */
function mergeMissingWidgets(layout: CasesLayout): CasesLayout {
    const existingIds = new Set(layout.map((w) => w.id));
    const maxOrder = layout.reduce((max, w) => Math.max(max, w.order), -1);
    const missing = DEFAULT_CASES_LAYOUT.filter((w) => !existingIds.has(w.id));

    return [
        ...layout,
        ...missing.map((w, i) => ({ ...w, visible: true, order: maxOrder + 1 + i })),
    ];
}

/** 讀取目前使用者的 `/cases` 頁面板塊版面設定；未登入、無資料或格式不符時回退預設版面 */
export async function getCasesLayout(): Promise<CasesLayout> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return DEFAULT_CASES_LAYOUT;

    const { data, error } = await supabase
        .from('user_settings')
        .select('cases_layout')
        .eq('user_id', user.id)
        .maybeSingle();

    if (error || !data?.cases_layout) return DEFAULT_CASES_LAYOUT;

    const parsed = CasesLayoutSchema.safeParse(data.cases_layout);
    if (!parsed.success) return DEFAULT_CASES_LAYOUT;

    return mergeMissingWidgets(parsed.data);
}

/** 寫入目前使用者的 `/cases` 頁面板塊版面設定；驗證失敗或未登入時不寫入 */
export async function updateCasesLayout(
    layout: CasesLayout
): Promise<{ success: boolean; error?: string }> {
    const parsed = CasesLayoutSchema.safeParse(layout);
    if (!parsed.success) return { success: false, error: '版面設定格式不正確' };

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: '未登入' };

    const { error } = await supabase.from('user_settings').upsert(
        {
            user_id: user.id,
            cases_layout: parsed.data,
            updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
    );

    if (error) return { success: false, error: error.message };
    return { success: true };
}
