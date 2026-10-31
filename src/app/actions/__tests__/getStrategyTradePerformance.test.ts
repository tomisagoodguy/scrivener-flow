/**
 * Tests for getStrategyTradePerformance server action（change: strategy-trade-performance）.
 *
 * 涵蓋 spec「Empty and failure states」：
 *  1. 持有中或近 60 天出場（or 篩選）、join 名稱與產業、asOf 取最大 latest_date
 *  2. strategy_trades 查詢失敗 → console.error、回空，且失敗不寫入快取（被快取的函式需拋錯）
 *  3. stock_basic_info 失敗只影響名稱產業，報酬照常回傳
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

import { getStrategyTradePerformance } from '../getStrategyTradePerformance';

const ROW = {
    strategy_id: 'trend_template',
    stock_id: '2330',
    entry_signal_date: '2026-10-12',
    entry_date: '2026-10-13',
    entry_price: 1000,
    exit_date: null,
    exit_price: null,
    latest_date: '2026-10-30',
    holding_return: 0.05,
    post_exit_return: null,
};

function tradesBuilder(data: unknown[] | null, error: unknown = null) {
    const builder: Record<string, jest.Mock> = {};
    ['select', 'or', 'order'].forEach((m) => {
        builder[m] = jest.fn(() => builder);
    });
    builder.range = jest.fn(() => Promise.resolve({ data, error }));
    return builder;
}

function infoBuilder(data: unknown[] | null, error: unknown = null) {
    const builder: Record<string, jest.Mock> = {};
    builder.select = jest.fn(() => builder);
    builder.in = jest.fn(() => Promise.resolve({ data, error }));
    return builder;
}

describe('getStrategyTradePerformance', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        cachedFns.length = 0;
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-10-31T00:00:00Z'));
    });
    afterEach(() => jest.useRealTimers());

    it('篩選持有中或近 60 天出場，join 名稱產業並回傳 asOf', async () => {
        const trades = tradesBuilder([ROW, { ...ROW, stock_id: '2454', latest_date: '2026-10-29' }]);
        mockFrom.mockImplementation((table: string) =>
            table === 'strategy_trades'
                ? trades
                : infoBuilder([{ stock_code: '2330', name_short: '台積電', industry: '半導體' }]),
        );

        const result = await getStrategyTradePerformance();

        expect(trades.or).toHaveBeenCalledWith('exit_date.is.null,exit_date.gte.2026-09-01');
        expect(result.asOf).toBe('2026-10-30');
        expect(result.trades[0]).toMatchObject({ stockId: '2330', name: '台積電', industry: '半導體', holdingReturn: 0.05 });
        expect(result.trades[1]).toMatchObject({ stockId: '2454', name: null, industry: null });
    });

    it('strategy_trades 失敗 → console.error、回空，且被快取的函式拋錯（不快取空結果）', async () => {
        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
        mockFrom.mockImplementation(() => tradesBuilder(null, { message: 'boom' }));

        await expect(getStrategyTradePerformance()).resolves.toEqual({ trades: [], asOf: null });
        expect(spy).toHaveBeenCalled();
        await expect(cachedFns[0]()).rejects.toThrow();
        spy.mockRestore();
    });

    it('stock_basic_info 失敗只缺名稱產業，報酬照常', async () => {
        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
        mockFrom.mockImplementation((table: string) =>
            table === 'strategy_trades' ? tradesBuilder([ROW]) : infoBuilder(null, { message: 'x' }),
        );

        const result = await getStrategyTradePerformance();

        expect(result.trades).toHaveLength(1);
        expect(result.trades[0]).toMatchObject({ name: null, holdingReturn: 0.05 });
        spy.mockRestore();
    });
});
