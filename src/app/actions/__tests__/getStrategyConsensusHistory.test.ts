/**
 * Tests for getStrategyConsensusHistory server action.
 *
 * 涵蓋 spec「Distinct-strategy count over a calendar window」：
 *  1. 視窗以 server 當日為錨（gte = 當日 − days、lte = 當日），僅取 is_selected
 *  2. 以 .range() 每頁 1000 取完全部列
 *  3. 非法 days 不查詢、回空
 *  4. Supabase 錯誤 → console.error 並回空
 */

jest.mock('next/cache', () => ({
    unstable_cache: (fn: () => unknown) => fn,
}));

const mockFrom = jest.fn();
jest.mock('@/lib/supabase/service', () => ({
    getPublicClient: () => ({ from: mockFrom }),
}));

import { getStrategyConsensusHistory } from '../getStrategyConsensusHistory';

interface Row { strategy_id: string; stock_id: string; date: string }

function makeSignalsBuilder(pages: Row[][], error: unknown = null) {
    let pageIdx = 0;
    const builder: Record<string, jest.Mock | unknown> = {};
    ['select', 'eq', 'gte', 'lte', 'order'].forEach((m) => {
        builder[m] = jest.fn(() => builder);
    });
    builder.range = jest.fn(() => {
        const data = error ? null : (pages[pageIdx] ?? []);
        pageIdx += 1;
        return Promise.resolve({ data, error });
    });
    return builder as Record<string, jest.Mock>;
}

function makeInfoBuilder(data: unknown[]) {
    const builder: Record<string, unknown> = {};
    builder.select = jest.fn(() => builder);
    builder.in = jest.fn(() => Promise.resolve({ data, error: null }));
    return builder as Record<string, jest.Mock>;
}

function rows(n: number, stockPrefix: string): Row[] {
    return Array.from({ length: n }, (_, i) => ({
        strategy_id: 'fund_momentum',
        stock_id: `${stockPrefix}${i}`,
        date: '2026-10-20',
    }));
}

describe('getStrategyConsensusHistory', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-10-23T00:00:00Z'));
    });
    afterEach(() => jest.useRealTimers());

    it('queries is_selected rows within [today − days, today] and fetches stock info', async () => {
        const signals = makeSignalsBuilder([[{ strategy_id: 'capital_layer', stock_id: '2330', date: '2026-10-17' }]]);
        const info = makeInfoBuilder([{ stock_code: '2330', name_short: '台積電', industry: '半導體業' }]);
        mockFrom.mockImplementation((t: string) => (t === 'strategy_signals' ? signals : info));

        const result = await getStrategyConsensusHistory(7);

        expect(signals.eq).toHaveBeenCalledWith('is_selected', true);
        expect(signals.gte).toHaveBeenCalledWith('date', '2026-10-16');
        expect(signals.lte).toHaveBeenCalledWith('date', '2026-10-23');
        expect(info.in).toHaveBeenCalledWith('stock_code', ['2330']);
        expect(result.rows).toHaveLength(1);
        expect(result.stockInfo).toEqual([{ stock_code: '2330', name_short: '台積電', industry: '半導體業' }]);
    });

    it('pages with range() until a page returns fewer than 1000 rows', async () => {
        const signals = makeSignalsBuilder([rows(1000, 'A'), rows(5, 'B')]);
        mockFrom.mockImplementation((t: string) => (t === 'strategy_signals' ? signals : makeInfoBuilder([])));

        const result = await getStrategyConsensusHistory(30);

        expect(signals.range).toHaveBeenNthCalledWith(1, 0, 999);
        expect(signals.range).toHaveBeenNthCalledWith(2, 1000, 1999);
        expect(signals.range).toHaveBeenCalledTimes(2);
        expect(result.rows).toHaveLength(1005);
    });

    it.each([5, 0, -7, 31, Number.NaN])('rejects invalid days %p without querying', async (days) => {
        const result = await getStrategyConsensusHistory(days);
        expect(mockFrom).not.toHaveBeenCalled();
        expect(result).toEqual({ rows: [], stockInfo: [] });
    });

    it('logs and returns empty on Supabase error', async () => {
        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const signals = makeSignalsBuilder([], { message: 'boom' });
        mockFrom.mockImplementation(() => signals);

        const result = await getStrategyConsensusHistory(14);

        expect(result).toEqual({ rows: [], stockInfo: [] });
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });
});
