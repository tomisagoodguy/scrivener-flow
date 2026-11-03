/**
 * Tests for getTaiexRegime server action（change: taiex-ma60-regime）.
 *
 * 涵蓋 spec「Regime card on the breadth page」的資料來源：
 *  1. 讀 taiex_ma60_regime_daily 最新一列
 *  2. 查無資料 → null
 *  3. 查詢失敗 → console.error、回 null，且被快取的函式拋錯（失敗不寫入快取）
 */

const cachedFns: (() => Promise<unknown>)[] = [];
jest.mock('next/cache', () => ({
    unstable_cache: (fn: () => Promise<unknown>) => {
        cachedFns.push(fn);
        return fn;
    },
}));

const mockFrom = jest.fn();
jest.mock('@/lib/supabase/service', () => ({
    getPublicClient: () => ({ from: mockFrom }),
}));

import { getTaiexRegime } from '../getTaiexRegime';

const ROW = {
    date: '2026-10-16',
    close: 47111.26,
    ma60: 46055.78,
    ma60_slope20: 882.17,
    ma_rising: true,
    days_above: 36,
    break_type: null,
    state: 'above',
    wave_break_count: 5,
    next_break_threshold: 46076.63,
    next_break_type: 'rebreak_rising',
    stats: {},
};

function builder(data: unknown[] | null, error: unknown = null) {
    const b: Record<string, jest.Mock> = {};
    b.select = jest.fn(() => b);
    b.order = jest.fn(() => b);
    b.limit = jest.fn(() => Promise.resolve({ data, error }));
    return b;
}

describe('getTaiexRegime', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        cachedFns.length = 0;
    });

    it('回傳最新一列（依 date 降冪取 1 筆）', async () => {
        const b = builder([ROW]);
        mockFrom.mockReturnValue(b);
        const result = await getTaiexRegime();
        expect(mockFrom).toHaveBeenCalledWith('taiex_ma60_regime_daily');
        expect(b.order).toHaveBeenCalledWith('date', { ascending: false });
        expect(b.limit).toHaveBeenCalledWith(1);
        expect(result?.date).toBe('2026-10-16');
        expect(result?.wave_break_count).toBe(5);
    });

    it('查無資料回 null', async () => {
        mockFrom.mockReturnValue(builder([]));
        expect(await getTaiexRegime()).toBeNull();
    });

    it('查詢失敗回 null、記錄錯誤，且快取函式拋錯', async () => {
        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
        mockFrom.mockReturnValue(builder(null, { message: 'boom' }));
        expect(await getTaiexRegime()).toBeNull();
        expect(spy).toHaveBeenCalled();
        await expect(cachedFns[cachedFns.length - 1]()).rejects.toThrow('boom');
        spy.mockRestore();
    });
});
