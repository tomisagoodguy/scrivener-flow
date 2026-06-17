/**
 * Tests for getStrategySignals server action.
 *
 * 涵蓋 spec「策略選股頁以 per-strategy 最新日期聚合呈現」三情境：
 *  1. 多策略不同日期皆顯示（各取自身最新日期）
 *  2. 視窗外策略不顯示（gte 視窗邊界）
 *  3. 顯式日期精確比對
 */

// unstable_cache 直接執行包裝函式（不快取）
jest.mock('next/cache', () => ({
    unstable_cache: (fn: () => unknown) => fn,
}));

const mockFrom = jest.fn();
jest.mock('@/lib/supabase/service', () => ({
    getPublicClient: () => ({ from: mockFrom }),
}));

import { getStrategySignals } from '../getStrategySignals';

interface SignalRow { strategy_id: string; stock_id: string; score: number | null; date: string }

/** strategy_signals 的 builder：date-lookup 以 .single() 終結，signals 以 await 終結並套用 eq/gte/lte 過濾。 */
function makeSignalsBuilder(allSignals: SignalRow[], maxDate: string) {
    const filters: { eqDate?: string; gte?: string; lte?: string } = {};
    const builder = {
        select: jest.fn(() => builder),
        order: jest.fn(() => builder),
        limit: jest.fn(() => builder),
        single: jest.fn(() => Promise.resolve({ data: { date: maxDate }, error: null })),
        eq: jest.fn((col: string, val: unknown) => {
            if (col === 'date') filters.eqDate = val as string;
            return builder;
        }),
        gte: jest.fn((_col: string, val: string) => {
            filters.gte = val;
            return builder;
        }),
        lte: jest.fn((_col: string, val: string) => {
            filters.lte = val;
            return builder;
        }),
        then: (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) => {
            let rows = allSignals.slice();
            if (filters.eqDate) rows = rows.filter((r) => r.date === filters.eqDate);
            if (filters.gte) rows = rows.filter((r) => r.date >= filters.gte!);
            if (filters.lte) rows = rows.filter((r) => r.date <= filters.lte!);
            return Promise.resolve({ data: rows, error: null }).then(onF, onR);
        },
    };
    return builder;
}

/** 一般清單表的 builder：忽略過濾，await 回傳固定 data。 */
function makeListBuilder(data: unknown[]) {
    const builder: Record<string, unknown> = {};
    ['select', 'eq', 'gte', 'lte', 'in', 'order', 'limit'].forEach((m) => {
        builder[m] = jest.fn(() => builder);
    });
    builder.then = (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) =>
        Promise.resolve({ data, error: null }).then(onF, onR);
    return builder;
}

function wireTables(signalsBuilder: unknown) {
    mockFrom.mockImplementation((table: string) => {
        switch (table) {
            case 'strategy_signals':
                return signalsBuilder;
            case 'etf_holdings_snapshot':
                return makeListBuilder([]);
            case 'etf_diff_logs':
                return makeListBuilder([]);
            case 'stock_basic_info':
                return makeListBuilder([]);
            default:
                return makeListBuilder([]);
        }
    });
}

describe('getStrategySignals', () => {
    beforeEach(() => jest.clearAllMocks());

    it('多策略不同日期皆顯示，各取自身最新日期；頂層 date 為最新者', async () => {
        // GIVEN fund_momentum 最新 2026-06-16；capital_layer / htf_gvi 最新 2026-06-10，皆在近 14 日視窗內
        const signals: SignalRow[] = [
            { strategy_id: 'fund_momentum', stock_id: '2330', score: 1, date: '2026-06-16' },
            { strategy_id: 'capital_layer', stock_id: '2317', score: 1, date: '2026-06-10' },
            { strategy_id: 'capital_layer', stock_id: '9999', score: 1, date: '2026-06-04' }, // 同策略較舊日期，應被略過
            { strategy_id: 'htf_gvi', stock_id: '2454', score: 1, date: '2026-06-10' },
        ];
        wireTables(makeSignalsBuilder(signals, '2026-06-16'));

        const result = await getStrategySignals();

        expect(result).not.toBeNull();
        expect(result!.date).toBe('2026-06-16');
        const ids = result!.strategies.map((s) => s.id).sort();
        expect(ids).toEqual(['capital_layer', 'fund_momentum', 'htf_gvi']);

        const capital = result!.strategies.find((s) => s.id === 'capital_layer')!;
        const capitalStocks = capital.stocks.map((st) => st.stock_id);
        expect(capitalStocks).toContain('2317'); // 2026-06-10
        expect(capitalStocks).not.toContain('9999'); // 2026-06-04 較舊，不顯示
    });

    it('視窗外策略不顯示：gte 套用 maxDate − 14 天為視窗起點', async () => {
        const signalsBuilder = makeSignalsBuilder(
            [{ strategy_id: 'fund_momentum', stock_id: '2330', score: 1, date: '2026-06-16' }],
            '2026-06-16',
        );
        wireTables(signalsBuilder);

        await getStrategySignals();

        // maxDate 2026-06-16 − 14 天 = 2026-06-02
        expect(signalsBuilder.gte).toHaveBeenCalledWith('date', '2026-06-02');
        // 未指定日期時不得用精確 eq('date', ...) 過濾
        const eqCalls = signalsBuilder.eq.mock.calls;
        expect(eqCalls.some((c) => c[0] === 'date')).toBe(false);
    });

    it('顯式日期維持精確比對：以 eq(date) 查詢且不套用視窗 gte', async () => {
        const signalsBuilder = makeSignalsBuilder(
            [
                { strategy_id: 'capital_layer', stock_id: '2317', score: 1, date: '2026-06-10' },
                { strategy_id: 'fund_momentum', stock_id: '2330', score: 1, date: '2026-06-16' },
            ],
            '2026-06-16',
        );
        wireTables(signalsBuilder);

        const result = await getStrategySignals('2026-06-10');

        expect(result).not.toBeNull();
        expect(result!.date).toBe('2026-06-10');
        expect(signalsBuilder.eq).toHaveBeenCalledWith('date', '2026-06-10');
        // 顯式日期模式不查全表最新日期、不套窗
        expect(signalsBuilder.single).not.toHaveBeenCalled();
        expect(signalsBuilder.gte).not.toHaveBeenCalled();
        // 僅回傳該日期策略
        expect(result!.strategies.map((s) => s.id)).toEqual(['capital_layer']);
    });
});
