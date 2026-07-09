/**
 * Tests for getManagerDualTrack server action.
 *
 * 涵蓋：
 *  1. getManagers()：多位經理人聚合（etfCodes / fundShorts 歸戶，含只管基金者）
 *  2. getManagerDualTrack()：etfHoldings（Top 20 截斷 + weight 降冪）、
 *     fundHoldings（同鍵 sitca 優先於 mops）、gapTable（fund-only / etf-only 標記）、
 *     signals（近 3 期過濾 + fund_names 交集）
 *  3. 空資料情境：fund_holdings_monthly 無資料時 fundHoldings 為空、fundYm 為 null
 */

const mockFrom = jest.fn();
jest.mock('@/lib/supabase/server', () => ({
    createClient: async () => ({ from: mockFrom }),
}));

import { getManagers, getManagerDualTrack } from '../getManagerDualTrack';

/** 通用 builder：忽略呼叫序，await 終結時回傳固定 data。 */
function makeBuilder(data: unknown[] | null) {
    const builder: Record<string, unknown> = {};
    ['select', 'eq', 'is', 'in', 'order', 'limit'].forEach((m) => {
        builder[m] = jest.fn(() => builder);
    });
    builder.then = (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) =>
        Promise.resolve({ data, error: null }).then(onF, onR);
    return builder;
}

/** 會實際套用 `.in(col, values)` 過濾的 builder（用於驗證「近 3 期」過濾行為）。 */
function makeFilterableBuilder(data: Record<string, unknown>[]) {
    const filters: { inCol?: string; inVals?: unknown[] } = {};
    const builder: Record<string, unknown> = {};
    ['select', 'eq', 'is', 'order', 'limit'].forEach((m) => {
        builder[m] = jest.fn(() => builder);
    });
    builder.in = jest.fn((col: string, vals: unknown[]) => {
        filters.inCol = col;
        filters.inVals = vals;
        return builder;
    });
    builder.then = (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) => {
        let rows = data.slice();
        if (filters.inCol && filters.inVals) {
            const vals = filters.inVals;
            rows = rows.filter((r) => vals.includes(r[filters.inCol as string]));
        }
        return Promise.resolve({ data: rows, error: null }).then(onF, onR);
    };
    return builder;
}

interface TableData {
    fund_manager_map?: unknown[];
    etf_holdings_snapshot_date?: unknown[];
    etf_holdings_snapshot_rows?: unknown[];
    fund_holdings_monthly_ym?: unknown[];
    fund_holdings_monthly_rows?: unknown[];
    fund_signals_periods?: unknown[];
    fund_signals_rows?: unknown[];
}

/**
 * etf_holdings_snapshot 與 fund_holdings_monthly / fund_signals 各被呼叫兩次
 * （一次取最新日期/期別、一次取當期資料），用呼叫次數區分回傳哪組 data。
 */
function wireTables(t: TableData) {
    const etfCallCount = { n: 0 };
    const fundCallCount = { n: 0 };
    const signalCallCount = { n: 0 };

    mockFrom.mockImplementation((table: string) => {
        switch (table) {
            case 'fund_manager_map':
                return makeBuilder(t.fund_manager_map ?? []);
            case 'etf_holdings_snapshot':
                etfCallCount.n += 1;
                return makeBuilder(
                    etfCallCount.n === 1
                        ? (t.etf_holdings_snapshot_date ?? [])
                        : (t.etf_holdings_snapshot_rows ?? []),
                );
            case 'fund_holdings_monthly':
                fundCallCount.n += 1;
                return makeBuilder(
                    fundCallCount.n === 1
                        ? (t.fund_holdings_monthly_ym ?? [])
                        : (t.fund_holdings_monthly_rows ?? []),
                );
            case 'fund_signals':
                signalCallCount.n += 1;
                return signalCallCount.n === 1
                    ? makeBuilder(t.fund_signals_periods ?? [])
                    : makeFilterableBuilder((t.fund_signals_rows ?? []) as Record<string, unknown>[]);
            default:
                return makeBuilder([]);
        }
    });
}

describe('getManagers', () => {
    beforeEach(() => jest.clearAllMocks());

    it('聚合經理人 etfCodes/fundShorts：一位管 ETF+基金、一位只管基金', async () => {
        wireTables({
            fund_manager_map: [
                { manager: '呂宏宇', etf_code: '00981A', fund_short: '安聯台灣科技', type: 'etf' },
                { manager: '呂宏宇', etf_code: null, fund_short: '安聯台灣科技', type: 'fund' },
                { manager: '陳明', etf_code: null, fund_short: '野村優質高股息', type: 'fund' },
            ],
        });

        const managers = await getManagers();

        expect(managers).toHaveLength(2);
        const lu = managers.find((m) => m.manager === '呂宏宇')!;
        expect(lu.etfCodes).toEqual(['00981A']);
        expect(lu.fundShorts).toEqual(['安聯台灣科技']);

        const chen = managers.find((m) => m.manager === '陳明')!;
        expect(chen.etfCodes).toEqual([]);
        expect(chen.fundShorts).toEqual(['野村優質高股息']);
    });
});

describe('getManagerDualTrack', () => {
    beforeEach(() => jest.clearAllMocks());

    it('etfHoldings 依 weight 降冪且截斷 Top 20；fundHoldings 同鍵 sitca 優先於 mops；gapTable 標記正確；signals 近 3 期 + fund_names 交集', async () => {
        const etfRows = Array.from({ length: 25 }, (_, i) => ({
            etf_code: '00981A',
            stock_code: `STK${i}`,
            stock_name: `股票${i}`,
            weight: i, // 0..24，程式內會重新降冪排序
            data_date: '2026-07-01',
        }));

        const fundRows = [
            { fund_short: '安聯台灣科技', ym: '202606', stock_code: '2330', stock_name: '台積電', rank: 2, pct: 5, source: 'mops' },
            { fund_short: '安聯台灣科技', ym: '202606', stock_code: '2330', stock_name: '台積電', rank: 1, pct: 5.5, source: 'sitca' },
            { fund_short: '安聯台灣科技', ym: '202606', stock_code: '2317', stock_name: '鴻海', rank: 3, pct: 2, source: 'mops' },
        ];

        const periods = [{ period: '202606' }, { period: '202605' }, { period: '202604' }, { period: '202603' }];
        const signalRows = [
            {
                id: 1,
                signal_type: 'buy',
                stock_code: '2330',
                period: '202606',
                strength: 0.8,
                fund_names: ['安聯台灣科技'],
                metadata: { note: 'x' },
            },
            {
                id: 2,
                signal_type: 'buy',
                stock_code: '9999',
                period: '202606',
                strength: 0.5,
                fund_names: ['某不相干基金'],
                metadata: {},
            },
            {
                id: 3,
                signal_type: 'buy',
                stock_code: '2454',
                period: '202603', // 第 4 期（>3 期），應被排除
                strength: 0.9,
                fund_names: ['安聯台灣科技'],
                metadata: {},
            },
        ];

        wireTables({
            fund_manager_map: [
                { manager: '呂宏宇', etf_code: '00981A', fund_short: '安聯台灣科技', type: 'etf' },
                { manager: '呂宏宇', etf_code: null, fund_short: '安聯台灣科技', type: 'fund' },
            ],
            etf_holdings_snapshot_date: [{ data_date: '2026-07-01' }],
            etf_holdings_snapshot_rows: etfRows,
            fund_holdings_monthly_ym: [{ ym: '202606' }],
            fund_holdings_monthly_rows: fundRows,
            fund_signals_periods: periods,
            fund_signals_rows: signalRows,
        });

        const result = await getManagerDualTrack('呂宏宇');

        // etfHoldings: Top 20，weight 降冪（最高 weight=24 排第一）
        expect(result.etfHoldings).toHaveLength(20);
        expect(result.etfHoldings[0].stock_code).toBe('STK24');
        expect(result.etfHoldings[0].weight).toBe(24);
        expect(result.etfHoldings[0].rank).toBe(1);
        expect(result.etfDataDate).toBe('2026-07-01');

        // fundHoldings: 2330 保留 sitca 版本（rank 1, pct 5.5），非 mops
        const stk2330 = result.fundHoldings.find((f) => f.stock_code === '2330')!;
        expect(stk2330.source).toBe('sitca');
        expect(stk2330.rank).toBe(1);
        expect(result.fundYm).toBe('202606');

        // gapTable: ETF 持股中 STK0..STK24 都不在 fundHoldings，故為 etf-only；
        // fundHoldings 的 2330/2317 都不在 etfHoldings（stock_code 不重疊），故為 fund-only
        const fundOnly = result.gapTable.filter((g) => g.side === 'fund-only').map((g) => g.stock_code);
        const etfOnly = result.gapTable.filter((g) => g.side === 'etf-only').map((g) => g.stock_code);
        expect(fundOnly.sort()).toEqual(['2317', '2330']);
        expect(etfOnly).toHaveLength(20);

        // signals: 近 3 期（202606/202605/202604，202603 排除）+ fund_names 與 fundShorts 交集
        expect(result.signals.map((s) => s.id)).toEqual([1]);
        expect(result.signals[0].fund_names).toEqual(['安聯台灣科技']);
    });

    it('經理人不存在於 fund_manager_map 時回傳空結果', async () => {
        wireTables({ fund_manager_map: [] });

        const result = await getManagerDualTrack('不存在的人');

        expect(result.etfCodes).toEqual([]);
        expect(result.fundShorts).toEqual([]);
        expect(result.etfHoldings).toEqual([]);
        expect(result.fundHoldings).toEqual([]);
        expect(result.fundYm).toBeNull();
        expect(result.gapTable).toEqual([]);
        expect(result.signals).toEqual([]);
    });

    it('fund_holdings_monthly 無資料時 fundHoldings 為空且 fundYm 為 null', async () => {
        wireTables({
            fund_manager_map: [
                { manager: '呂宏宇', etf_code: '00981A', fund_short: '安聯台灣科技', type: 'etf' },
            ],
            etf_holdings_snapshot_date: [{ data_date: '2026-07-01' }],
            etf_holdings_snapshot_rows: [],
            fund_holdings_monthly_ym: [], // 無任何月報資料
            fund_signals_periods: [],
            fund_signals_rows: [],
        });

        const result = await getManagerDualTrack('呂宏宇');

        expect(result.fundHoldings).toEqual([]);
        expect(result.fundYm).toBeNull();
    });
});
