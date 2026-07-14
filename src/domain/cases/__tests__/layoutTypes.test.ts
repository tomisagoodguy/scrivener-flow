import { CasesLayoutSchema, DEFAULT_CASES_LAYOUT } from '../layoutTypes';

describe('CasesLayoutSchema', () => {
    it('通過合法陣列（含所有欄位、正確型別）', () => {
        const result = CasesLayoutSchema.safeParse([
            { id: 'rapid-input', visible: true, order: 0 },
            { id: 'quick-navigator', visible: false, order: 1 },
        ]);
        expect(result.success).toBe(true);
    });

    it('通過空陣列', () => {
        const result = CasesLayoutSchema.safeParse([]);
        expect(result.success).toBe(true);
    });

    it('缺少 order 欄位時失敗', () => {
        const result = CasesLayoutSchema.safeParse([{ id: 'rapid-input', visible: true }]);
        expect(result.success).toBe(false);
    });

    it('order 為字串時失敗', () => {
        const result = CasesLayoutSchema.safeParse([{ id: 'rapid-input', visible: true, order: '0' }]);
        expect(result.success).toBe(false);
    });

    it('order 為負數時失敗', () => {
        const result = CasesLayoutSchema.safeParse([{ id: 'rapid-input', visible: true, order: -1 }]);
        expect(result.success).toBe(false);
    });

    it('id 不在允許清單中時失敗（非本頁 5 個 widget id 之一）', () => {
        const result = CasesLayoutSchema.safeParse([{ id: 'not-a-real-widget', visible: true, order: 0 }]);
        expect(result.success).toBe(false);
    });

    it('visible 為非 boolean 時失敗', () => {
        const result = CasesLayoutSchema.safeParse([{ id: 'rapid-input', visible: 'yes', order: 0 }]);
        expect(result.success).toBe(false);
    });
});

describe('DEFAULT_CASES_LAYOUT', () => {
    it('本身符合 CasesLayoutSchema', () => {
        expect(CasesLayoutSchema.safeParse(DEFAULT_CASES_LAYOUT).success).toBe(true);
    });

    it('對應現行寫死順序，全部可見，且 order 遞增不重複', () => {
        expect(DEFAULT_CASES_LAYOUT.map((w) => w.id)).toEqual([
            'export-buttons',
            'rapid-input',
            'quick-navigator',
            'pipeline-chart',
            'eisenhower-matrix',
        ]);
        expect(DEFAULT_CASES_LAYOUT.every((w) => w.visible)).toBe(true);
        expect(DEFAULT_CASES_LAYOUT.map((w) => w.order)).toEqual([0, 1, 2, 3, 4]);
    });
});
