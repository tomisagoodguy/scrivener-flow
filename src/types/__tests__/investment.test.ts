import { CHANGE_TYPE_LABELS } from '@/types/investment';

// ETF/processors/diff_engine.py 實際輸出的 change_type 全集
// （etf_diff_logs 現有資料：BUY/SELL/TRIM/IN/OUT/CLOSE）
const PIPELINE_CHANGE_TYPES = ['IN', 'BUY', 'SELL', 'TRIM', 'OUT', 'CLOSE'] as const;

describe('CHANGE_TYPE_LABELS', () => {
    it.each(PIPELINE_CHANGE_TYPES)('pipeline change_type「%s」必須有中文 label', (type) => {
        const label = (CHANGE_TYPE_LABELS as Record<string, string>)[type];
        expect(label).toBeTruthy();
        // label 必須是中文，不能漏對應而回退顯示英文原值
        expect(label).not.toBe(type);
    });

    it('label 對應表沒有多餘的未知 key', () => {
        for (const key of Object.keys(CHANGE_TYPE_LABELS)) {
            expect(PIPELINE_CHANGE_TYPES).toContain(key);
        }
    });
});
