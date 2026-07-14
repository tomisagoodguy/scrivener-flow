'use server';

import { createClient } from '@/lib/supabase/server';
import {
    DashboardLayoutSchema,
    DEFAULT_DASHBOARD_LAYOUT,
    type DashboardLayout,
} from '@/domain/dashboard/layoutTypes';

/** 缺席於已儲存版面的 widget id（例如新上線的區塊），補為可見並接在既有最大 order 之後 */
function mergeMissingWidgets(layout: DashboardLayout): DashboardLayout {
    const existingIds = new Set(layout.map((w) => w.id));
    const maxOrder = layout.reduce((max, w) => Math.max(max, w.order), -1);
    const missing = DEFAULT_DASHBOARD_LAYOUT.filter((w) => !existingIds.has(w.id));

    return [
        ...layout,
        ...missing.map((w, i) => ({ ...w, visible: true, order: maxOrder + 1 + i })),
    ];
}

/** 讀取目前使用者的儀表板版面設定；未登入、無資料或格式不符時回退預設版面 */
export async function getDashboardLayout(): Promise<DashboardLayout> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return DEFAULT_DASHBOARD_LAYOUT;

    const { data, error } = await supabase
        .from('user_settings')
        .select('dashboard_layout')
        .eq('user_id', user.id)
        .maybeSingle();

    if (error || !data?.dashboard_layout) return DEFAULT_DASHBOARD_LAYOUT;

    const parsed = DashboardLayoutSchema.safeParse(data.dashboard_layout);
    if (!parsed.success) return DEFAULT_DASHBOARD_LAYOUT;

    return mergeMissingWidgets(parsed.data);
}

/** 寫入目前使用者的儀表板版面設定；驗證失敗或未登入時不寫入 */
export async function updateDashboardLayout(
    layout: DashboardLayout
): Promise<{ success: boolean; error?: string }> {
    const parsed = DashboardLayoutSchema.safeParse(layout);
    if (!parsed.success) return { success: false, error: '版面設定格式不正確' };

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: '未登入' };

    const { error } = await supabase.from('user_settings').upsert(
        {
            user_id: user.id,
            dashboard_layout: parsed.data,
            updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
    );

    if (error) return { success: false, error: error.message };
    return { success: true };
}
