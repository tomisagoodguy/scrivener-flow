/**
 * Tests for getStrategyChartTrades（change: strategy-chart-holding-marks, task 1.2）.
 *  1. 依股票代碼分批（每批 300）查 strategy_trades，篩持有中或近 400 天出場，彙整成每股標記
 *  2. 空代碼清單不查詢
 *  3. 查詢錯誤時 throw（由頁面 catch 後以空物件繼續）
 */

const mockFrom = jest.fn();
jest.mock('@/lib/supabase/service', () => ({
    getPublicClient: () => ({ from: mockFrom }),
}));

import { getStrategyChartTrades, getStrategyChartTradesOrEmpty } from '../getStrategyChartTrades';

function tradesBuilder(data: unknown[] | null, error: unknown = null) {
    const builder: Record<string, jest.Mock> = {};
    ['select', 'in', 'or', 'order'].forEach((m) => {
        builder[m] = jest.fn(() => builder);
    });
    builder.range = jest.fn(() => Promise.resolve({ data, error }));
    return builder;
}

describe('getStrategyChartTrades', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-10-31T00:00:00Z'));
    });
    afterEach(() => jest.useRealTimers());

    it('分批查詢並彙整成每股標記，篩持有中或近 400 天出場', async () => {
        const first = tradesBuilder([
            { stock_id: '2330', entry_signal_date: '2026-09-30', entry_date: '2026-10-01', exit_date: null },
        ]);
        const second = tradesBuilder([
            { stock_id: '9999', entry_signal_date: '2026-08-29', entry_date: null, exit_date: null },
        ]);
        mockFrom.mockReturnValueOnce(first).mockReturnValueOnce(second);
        const ids = Array.from({ length: 301 }, (_, i) => String(1000 + i));

        const result = await getStrategyChartTrades(ids);

        expect(mockFrom).toHaveBeenCalledTimes(2);
        expect(mockFrom).toHaveBeenCalledWith('strategy_trades');
        expect(first.in).toHaveBeenCalledWith('stock_id', ids.slice(0, 300));
        expect(second.in).toHaveBeenCalledWith('stock_id', ids.slice(300));
        expect(first.or).toHaveBeenCalledWith('exit_date.is.null,exit_date.gte.2025-09-26');
        // 分頁排序須含唯一鍵三欄，同股同日多策略的列才不會在頁界漏抓
        expect(first.order.mock.calls.map((c) => c[0])).toEqual(['strategy_id', 'stock_id', 'entry_signal_date']);
        expect(result).toEqual({
            '2330': {
                entryDates: ['2026-10-01'],
                exitDates: [],
                periods: [{ start: '2026-10-01', end: null }],
            },
        });
    });

    it('空代碼清單 → 不查詢、回空物件', async () => {
        await expect(getStrategyChartTrades([])).resolves.toEqual({});
        expect(mockFrom).not.toHaveBeenCalled();
    });

    it('查詢錯誤 → throw', async () => {
        mockFrom.mockReturnValueOnce(tradesBuilder(null, { message: 'boom' }));

        await expect(getStrategyChartTrades(['2330'])).rejects.toThrow('strategy_trades query failed: boom');
    });

    it('OrEmpty：查詢錯誤 → console.error 後回空物件（頁面據此照常顯示圖表）', async () => {
        const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        mockFrom.mockReturnValueOnce(tradesBuilder(null, { message: 'boom' }));

        await expect(getStrategyChartTradesOrEmpty(['2330'])).resolves.toEqual({});
        expect(spy).toHaveBeenCalledWith('[getStrategyChartTrades]', 'strategy_trades query failed: boom');
        spy.mockRestore();
    });
});
