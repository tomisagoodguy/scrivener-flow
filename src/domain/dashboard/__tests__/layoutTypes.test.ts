import { DashboardLayoutSchema, DEFAULT_DASHBOARD_LAYOUT } from '../layoutTypes';

describe('DashboardLayoutSchema', () => {
    it('通過合法陣列（含所有欄位、正確型別）', () => {
        const result = DashboardLayoutSchema.safeParse([
            { id: 'pipeline-view', visible: true, order: 0 },
            { id: 'todo-container', visible: false, order: 1 },
        ]);
        expect(result.success).toBe(true);
    });

    it('通過空陣列', () => {
        const result = DashboardLayoutSchema.safeParse([]);
        expect(result.success).toBe(true);
    });

    it('缺少 order 欄位時失敗', () => {
        const result = DashboardLayoutSchema.safeParse([
            { id: 'pipeline-view', visible: true },
        ]);
        expect(result.success).toBe(false);
    });

    it('order 為字串時失敗', () => {
        const result = DashboardLayoutSchema.safeParse([
            { id: 'pipeline-view', visible: true, order: '0' },
        ]);
        expect(result.success).toBe(false);
    });

    it('order 為負數時失敗', () => {
        const result = DashboardLayoutSchema.safeParse([
            { id: 'pipeline-view', visible: true, order: -1 },
        ]);
        expect(result.success).toBe(false);
    });

    it('id 不在允許清單中時失敗', () => {
        const result = DashboardLayoutSchema.safeParse([
            { id: 'not-a-real-widget', visible: true, order: 0 },
        ]);
        expect(result.success).toBe(false);
    });

    it('visible 為非 boolean 時失敗', () => {
        const result = DashboardLayoutSchema.safeParse([
            { id: 'pipeline-view', visible: 'yes', order: 0 },
        ]);
        expect(result.success).toBe(false);
    });
});

describe('DEFAULT_DASHBOARD_LAYOUT', () => {
    it('本身符合 DashboardLayoutSchema', () => {
        expect(DashboardLayoutSchema.safeParse(DEFAULT_DASHBOARD_LAYOUT).success).toBe(true);
    });

    it('對應現行寫死順序，全部可見，且 order 遞增不重複', () => {
        expect(DEFAULT_DASHBOARD_LAYOUT.map((w) => w.id)).toEqual([
            'welcome-header',
            'ai-work-assistant',
            'urgent-alerts-tax-watch',
            'pipeline-view',
            'eisenhower-matrix',
            'todo-container',
        ]);
        expect(DEFAULT_DASHBOARD_LAYOUT.every((w) => w.visible)).toBe(true);
        expect(DEFAULT_DASHBOARD_LAYOUT.map((w) => w.order)).toEqual([0, 1, 2, 3, 4, 5]);
    });
});
