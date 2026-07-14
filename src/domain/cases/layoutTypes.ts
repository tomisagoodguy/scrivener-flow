import { z } from 'zod';

/** `/cases` 頁面功能板塊唯一識別鍵；對應 user_settings.cases_layout JSONB 陣列 */
export const CasesWidgetIdSchema = z.enum([
    'export-buttons',
    'rapid-input',
    'quick-navigator',
    'pipeline-chart',
    'eisenhower-matrix',
]);

export const CasesWidgetLayoutItemSchema = z.object({
    id: CasesWidgetIdSchema,
    visible: z.boolean(),
    order: z.number().int().min(0),
});

export const CasesLayoutSchema = z.array(CasesWidgetLayoutItemSchema);

export type CasesWidgetId = z.infer<typeof CasesWidgetIdSchema>;
export type CasesWidgetLayoutItem = z.infer<typeof CasesWidgetLayoutItemSchema>;
export type CasesLayout = z.infer<typeof CasesLayoutSchema>;

/** 板塊顯示名稱，供隱藏板塊清單等 UI 使用 */
export const CASES_WIDGET_LABELS: Record<CasesWidgetId, string> = {
    'export-buttons': '匯出按鈕',
    'rapid-input': '閃電快速輸入列',
    'quick-navigator': '快速導航',
    'pipeline-chart': '案件進度總覽',
    'eisenhower-matrix': '輕重緩急看板',
};

/** 對應現行 page.tsx 寫死順序，全部可見，供未設定過版面的使用者使用 */
export const DEFAULT_CASES_LAYOUT: CasesLayout = [
    { id: 'export-buttons', visible: true, order: 0 },
    { id: 'rapid-input', visible: true, order: 1 },
    { id: 'quick-navigator', visible: true, order: 2 },
    { id: 'pipeline-chart', visible: true, order: 3 },
    { id: 'eisenhower-matrix', visible: true, order: 4 },
];
