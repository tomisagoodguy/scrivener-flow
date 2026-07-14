import { z } from 'zod';

/** 首頁儀表板區塊唯一識別鍵；對應 user_settings.dashboard_layout JSONB 陣列 */
export const DashboardWidgetIdSchema = z.enum([
    'welcome-header',
    'ai-work-assistant',
    'urgent-alerts-tax-watch',
    'pipeline-view',
    'eisenhower-matrix',
    'todo-container',
]);

export const DashboardWidgetLayoutItemSchema = z.object({
    id: DashboardWidgetIdSchema,
    visible: z.boolean(),
    order: z.number().int().min(0),
});

export const DashboardLayoutSchema = z.array(DashboardWidgetLayoutItemSchema);

export type DashboardWidgetId = z.infer<typeof DashboardWidgetIdSchema>;
export type DashboardWidgetLayoutItem = z.infer<typeof DashboardWidgetLayoutItemSchema>;
export type DashboardLayout = z.infer<typeof DashboardLayoutSchema>;

/** 區塊顯示名稱，供隱藏區塊清單等 UI 使用 */
export const DASHBOARD_WIDGET_LABELS: Record<DashboardWidgetId, string> = {
    'welcome-header': '歡迎頁首',
    'ai-work-assistant': 'AI 工作助理',
    'urgent-alerts-tax-watch': '緊急提醒與稅務追蹤',
    'pipeline-view': '案件進度總覽',
    'eisenhower-matrix': '艾森豪矩陣',
    'todo-container': '待辦事項',
};

/** 對應現行 WorkDashboard.tsx 寫死順序，全部可見，供未設定過版面的使用者使用 */
export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = [
    { id: 'welcome-header', visible: true, order: 0 },
    { id: 'ai-work-assistant', visible: true, order: 1 },
    { id: 'urgent-alerts-tax-watch', visible: true, order: 2 },
    { id: 'pipeline-view', visible: true, order: 3 },
    { id: 'eisenhower-matrix', visible: true, order: 4 },
    { id: 'todo-container', visible: true, order: 5 },
];
