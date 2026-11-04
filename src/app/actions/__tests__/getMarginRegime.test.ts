/**
 * Spec: Margin regime card — No data（查詢失敗時回 null，卡片顯示尚未更新）
 */
jest.mock('next/cache', () => ({
    unstable_cache: (fn: () => Promise<unknown>) => fn,
}));

const mockFrom = jest.fn();
jest.mock('@/lib/supabase/service', () => ({
    getPublicClient: () => ({ from: mockFrom }),
}));

import { getMarginRegime } from '../getMarginRegime';

function mockResult(result: { data: unknown; error: { message: string } | null }) {
    const builder = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(result),
    };
    mockFrom.mockReturnValue(builder);
}

describe('getMarginRegime', () => {
    beforeEach(() => {
        mockFrom.mockReset();
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('returns the latest row', async () => {
        mockResult({ data: [{ date: '2026-11-02', margin_balance: 8271.11, margin_1y_high: false, index_near_high: false, stats: {} }], error: null });
        await expect(getMarginRegime()).resolves.toMatchObject({ date: '2026-11-02' });
        expect(mockFrom).toHaveBeenCalledWith('market_margin_regime_daily');
    });

    it('returns null when the table is empty', async () => {
        mockResult({ data: [], error: null });
        await expect(getMarginRegime()).resolves.toBeNull();
    });

    it('returns null when the query fails', async () => {
        mockResult({ data: null, error: { message: 'boom' } });
        await expect(getMarginRegime()).resolves.toBeNull();
    });
});
