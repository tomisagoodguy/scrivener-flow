/**
 * Tests for getFanBreakoutSignals server action (change: fan-breakout-screener, task 4.2).
 *
 * TDD: written BEFORE implementation. Covers spec scenarios:
 *   - Page lists recent signals (rows with conditions, names, performance; ordered date desc, score desc)
 *   - No signals -> empty rows, no error
 *   - Query failure -> empty rows with non-empty error (never "no data")
 *   - conditions = null -> condition fields null / []
 *   - Price missing on signal date -> performance fields null
 */

// unstable_cache 直接執行包裝函式（不快取）
const mockUnstableCache = jest.fn();
jest.mock('next/cache', () => ({
    unstable_cache: (fn: () => unknown, keys: string[], opts: { revalidate: number }) => {
        mockUnstableCache(keys, opts);
        return fn;
    },
}));

const mockFrom = jest.fn();
jest.mock('@/lib/supabase/service', () => ({
    getPublicClient: () => ({ from: mockFrom }),
}));

import { getFanBreakoutSignals } from '../getFanBreakoutSignals';

type Row = Record<string, unknown>;

const SERVER_MAX_ROWS = 1000;

interface QueryRecord {
    table: string;
    eq: Array<[string, unknown]>;
    gte: Array<[string, unknown]>;
    in: Array<[string, unknown[]]>;
    range: Array<[number, number]>;
}

interface TableResult {
    rows?: Row[];
    error?: { message: string } | null;
}

/**
 * 可鏈式 query builder：實際套用 eq / gte / in / order / range，
 * 並把每次查詢的過濾條件記到 queries，供斷言。
 */
function makeBuilder(table: string, result: TableResult, queries: QueryRecord[]) {
    const record: QueryRecord = { table, eq: [], gte: [], in: [], range: [] };
    queries.push(record);
    const orders: Array<{ col: string; asc: boolean }> = [];
    const builder: Record<string, unknown> = {};

    builder.select = jest.fn(() => builder);
    builder.eq = jest.fn((col: string, val: unknown) => {
        record.eq.push([col, val]);
        return builder;
    });
    builder.gte = jest.fn((col: string, val: unknown) => {
        record.gte.push([col, val]);
        return builder;
    });
    builder.in = jest.fn((col: string, vals: unknown[]) => {
        record.in.push([col, vals]);
        return builder;
    });
    builder.order = jest.fn((col: string, opts?: { ascending?: boolean }) => {
        orders.push({ col, asc: opts?.ascending !== false });
        return builder;
    });
    builder.range = jest.fn((from: number, to: number) => {
        record.range.push([from, to]);
        return builder;
    });
    builder.then = (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) => {
        if (result.error) return Promise.resolve({ data: null, error: result.error }).then(onF, onR);
        let rows = (result.rows ?? []).slice();
        for (const [col, val] of record.eq) rows = rows.filter((r) => r[col] === val);
        for (const [col, val] of record.gte) rows = rows.filter((r) => String(r[col]) >= String(val));
        for (const [col, vals] of record.in) rows = rows.filter((r) => vals.includes(r[col]));
        for (const { col, asc } of [...orders].reverse()) {
            rows.sort((a, b) => (String(a[col]) < String(b[col]) ? -1 : String(a[col]) > String(b[col]) ? 1 : 0) * (asc ? 1 : -1));
        }
        // 模擬 PostgREST max-rows：單次回應最多 1000 列（沒帶 range 也一樣被截斷）
        const last = record.range[record.range.length - 1];
        rows = last ? rows.slice(last[0], last[1] + 1) : rows;
        rows = rows.slice(0, SERVER_MAX_ROWS);
        return Promise.resolve({ data: rows, error: null }).then(onF, onR);
    };
    return builder;
}

function wireTables(tables: Record<string, TableResult>): QueryRecord[] {
    const queries: QueryRecord[] = [];
    mockFrom.mockImplementation((table: string) => makeBuilder(table, tables[table] ?? { rows: [] }, queries));
    return queries;
}

const COND_FIRST = {
    signal_type: 'first',
    consec_days: 1,
    spread: 0.1834,
    market: '上市',
    recent_signal_dates: ['2026-10-22'],
};

describe('getFanBreakoutSignals', () => {
    let consoleError: jest.SpyInstance;

    // 固定 server 當日為 2026-10-23，視窗起點 = 2026-09-23
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-10-23T00:00:00Z'));
        consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });
    afterEach(() => {
        jest.useRealTimers();
        consoleError.mockRestore();
    });

    it('正常回傳：帶出 conditions、名稱與績效，依日期新到舊、同日 score 大到小排序', async () => {
        const queries = wireTables({
            strategy_signals: {
                rows: [
                    { strategy_id: 'fan_breakout', is_selected: true, date: '2026-10-21', stock_id: '2317', score: 0.5, conditions: null },
                    { strategy_id: 'fan_breakout', is_selected: true, date: '2026-10-22', stock_id: '6488', score: 0.12, conditions: { ...COND_FIRST, market: '上櫃', signal_type: 'repeat', consec_days: 3, recent_signal_dates: ['2026-10-20', '2026-10-21', '2026-10-22'] } },
                    { strategy_id: 'fan_breakout', is_selected: true, date: '2026-10-22', stock_id: '2330', score: 0.1834, conditions: COND_FIRST },
                    // 不同策略、視窗外、未入選：都不得出現
                    { strategy_id: 'fund_momentum', is_selected: true, date: '2026-10-22', stock_id: '9999', score: 9, conditions: null },
                    { strategy_id: 'fan_breakout', is_selected: true, date: '2026-08-01', stock_id: '1101', score: 9, conditions: null },
                    { strategy_id: 'fan_breakout', is_selected: false, date: '2026-10-22', stock_id: '1102', score: 9, conditions: null },
                ],
            },
            stock_basic_info: {
                rows: [
                    { stock_code: '2330', name_short: '台積電', name_full: '台灣積體電路製造' },
                    { stock_code: '6488', name_short: '環球晶', name_full: null },
                    { stock_code: '2317', name_short: '鴻海', name_full: null },
                ],
            },
            stock_prices_daily: {
                rows: [
                    // 2330：訊號日 10-22 收 100，最新 10-23 收 112
                    { stock_code: '2330', data_date: '2026-10-22', high: 101, low: 99, close: 100 },
                    { stock_code: '2330', data_date: '2026-10-23', high: 115, low: 104, close: 112 },
                    // 6488：訊號日 10-22 收 100
                    { stock_code: '6488', data_date: '2026-10-22', high: 102, low: 98, close: 100 },
                    { stock_code: '6488', data_date: '2026-10-23', high: 99, low: 96, close: 97 },
                    // 2317：只有訊號日之後的資料，訊號日(10-21)缺價
                    { stock_code: '2317', data_date: '2026-10-22', high: 160, low: 150, close: 155 },
                ],
            },
        });

        const result = await getFanBreakoutSignals();

        expect(result.error).toBeUndefined();
        expect(result.latestDate).toBe('2026-10-22');
        expect(result.rows.map((r) => `${r.date}:${r.stockId}`)).toEqual([
            '2026-10-22:2330', // score 0.1834
            '2026-10-22:6488', // score 0.12
            '2026-10-21:2317',
        ]);

        const tsmc = result.rows[0];
        expect(tsmc).toMatchObject({
            name: '台積電',
            score: 0.1834,
            signalType: 'first',
            consecDays: 1,
            spread: 0.1834,
            market: '上市',
            recentSignalDates: ['2026-10-22'],
            signalClose: 100,
            latestClose: 112,
            latestDate: '2026-10-23',
            returnSinceSignal: 0.12,
            highSinceSignal: 115,
            lowSinceSignal: 99,
        });

        const globalWafers = result.rows[1];
        expect(globalWafers).toMatchObject({
            name: '環球晶',
            signalType: 'repeat',
            consecDays: 3,
            market: '上櫃',
            returnSinceSignal: -0.03,
            highSinceSignal: 102,
            lowSinceSignal: 96,
        });
        expect(globalWafers.recentSignalDates).toEqual(['2026-10-20', '2026-10-21', '2026-10-22']);

        // strategy_signals 查詢：只取 fan_breakout、入選、近 30 天
        const sigQueries = queries.filter((q) => q.table === 'strategy_signals');
        expect(sigQueries.length).toBeGreaterThanOrEqual(1);
        expect(sigQueries[0].eq).toEqual(expect.arrayContaining([['strategy_id', 'fan_breakout'], ['is_selected', true]]));
        expect(sigQueries[0].gte).toEqual([['date', '2026-09-23']]);

        // 價格查詢：一次批次、codes in 清單、起點 = 最早訊號日
        const priceQueries = queries.filter((q) => q.table === 'stock_prices_daily');
        expect(priceQueries).toHaveLength(1);
        expect(priceQueries[0].in).toHaveLength(1);
        expect(priceQueries[0].in[0][0]).toBe('stock_code');
        expect([...priceQueries[0].in[0][1]].sort()).toEqual(['2317', '2330', '6488']);
        expect(priceQueries[0].gte).toEqual([['data_date', '2026-10-21']]);
    });

    it('conditions 為 null 的列：條件欄位補 null／空陣列，其餘照常', async () => {
        wireTables({
            strategy_signals: {
                rows: [{ strategy_id: 'fan_breakout', is_selected: true, date: '2026-10-22', stock_id: '2330', score: 0.2, conditions: null }],
            },
            stock_basic_info: { rows: [{ stock_code: '2330', name_short: '台積電', name_full: null }] },
            stock_prices_daily: { rows: [{ stock_code: '2330', data_date: '2026-10-22', high: 101, low: 99, close: 100 }] },
        });

        const result = await getFanBreakoutSignals();

        expect(result.error).toBeUndefined();
        expect(result.rows).toHaveLength(1);
        expect(result.rows[0]).toMatchObject({
            stockId: '2330',
            name: '台積電',
            score: 0.2,
            signalType: null,
            consecDays: null,
            spread: null,
            market: null,
            recentSignalDates: [],
            signalClose: 100,
        });
    });

    it('conditions 為 JSON 字串或含不合法欄位時，仍能解析合法欄位且不丟例外', async () => {
        wireTables({
            strategy_signals: {
                rows: [
                    { strategy_id: 'fan_breakout', is_selected: true, date: '2026-10-22', stock_id: '2330', score: 0.2, conditions: JSON.stringify(COND_FIRST) },
                    { strategy_id: 'fan_breakout', is_selected: true, date: '2026-10-22', stock_id: '6488', score: 0.1, conditions: { signal_type: 'bogus', consec_days: 'x', spread: 0.05, market: '興櫃', recent_signal_dates: 'oops' } },
                ],
            },
            stock_basic_info: { rows: [] },
            stock_prices_daily: { rows: [] },
        });

        const result = await getFanBreakoutSignals();

        expect(result.error).toBeUndefined();
        expect(result.rows[0]).toMatchObject({ stockId: '2330', signalType: 'first', market: '上市', spread: 0.1834 });
        expect(result.rows[1]).toMatchObject({
            stockId: '6488',
            signalType: null,
            consecDays: null,
            spread: 0.05,
            market: null,
            recentSignalDates: [],
        });
    });

    it('名稱缺漏時退回 name_full，再退回股票代號', async () => {
        wireTables({
            strategy_signals: {
                rows: [
                    { strategy_id: 'fan_breakout', is_selected: true, date: '2026-10-22', stock_id: '2330', score: 3, conditions: null },
                    { strategy_id: 'fan_breakout', is_selected: true, date: '2026-10-22', stock_id: '6488', score: 2, conditions: null },
                    { strategy_id: 'fan_breakout', is_selected: true, date: '2026-10-22', stock_id: '3105', score: 1, conditions: null },
                ],
            },
            stock_basic_info: {
                rows: [
                    { stock_code: '2330', name_short: null, name_full: '台灣積體電路製造' },
                    { stock_code: '6488', name_short: '環球晶', name_full: null },
                ],
            },
            stock_prices_daily: { rows: [] },
        });

        const result = await getFanBreakoutSignals();

        expect(result.rows.map((r) => r.name)).toEqual(['台灣積體電路製造', '環球晶', '3105']);
    });

    it('訊號日缺價：signalClose／績效欄位全為 null（不影響其他列）', async () => {
        wireTables({
            strategy_signals: {
                rows: [
                    { strategy_id: 'fan_breakout', is_selected: true, date: '2026-10-22', stock_id: '2330', score: 0.2, conditions: COND_FIRST },
                    { strategy_id: 'fan_breakout', is_selected: true, date: '2026-10-22', stock_id: '6488', score: 0.1, conditions: COND_FIRST },
                ],
            },
            stock_basic_info: { rows: [] },
            stock_prices_daily: {
                rows: [
                    // 2330 只有訊號日之後的價格
                    { stock_code: '2330', data_date: '2026-10-23', high: 115, low: 104, close: 112 },
                    // 6488 價格齊全
                    { stock_code: '6488', data_date: '2026-10-22', high: 102, low: 98, close: 100 },
                ],
            },
        });

        const result = await getFanBreakoutSignals();

        const tsmc = result.rows.find((r) => r.stockId === '2330')!;
        expect(tsmc).toMatchObject({
            signalClose: null,
            latestClose: null,
            latestDate: null,
            returnSinceSignal: null,
            highSinceSignal: null,
            lowSinceSignal: null,
        });
        const gw = result.rows.find((r) => r.stockId === '6488')!;
        expect(gw.signalClose).toBe(100);
        expect(gw.returnSinceSignal).toBe(0);
    });

    it('價格超過單頁上限時以 range 分頁讀完，不漏掉後面的高低點', async () => {
        // 1,100 根 K：第 1,050 根（超過 1,000 列上限）才出現最高價
        const prices: Row[] = Array.from({ length: 1100 }, (_, i) => {
            const d = new Date(Date.UTC(2020, 0, 1 + i)).toISOString().split('T')[0];
            return { stock_code: '2330', data_date: d, high: i === 1049 ? 999 : 100, low: 90, close: 95 };
        });
        const signalDate = prices[0].data_date as string;
        wireTables({
            strategy_signals: {
                rows: [{ strategy_id: 'fan_breakout', is_selected: true, date: signalDate, stock_id: '2330', score: 1, conditions: null }],
            },
            stock_basic_info: { rows: [] },
            stock_prices_daily: { rows: prices },
        });

        // 訊號日遠在視窗外會被過濾，這裡改用 fake timers 對齊訊號日
        jest.setSystemTime(new Date(`${signalDate}T00:00:00Z`));
        const result = await getFanBreakoutSignals();

        expect(result.error).toBeUndefined();
        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].highSinceSignal).toBe(999);
        expect(result.rows[0].latestDate).toBe(prices[1099].data_date);
    });

    it('無資料：回傳 { rows: [], latestDate: null }，沒有 error，也不再查名稱／價格', async () => {
        const queries = wireTables({ strategy_signals: { rows: [] } });

        const result = await getFanBreakoutSignals();

        expect(result).toEqual({ rows: [], latestDate: null });
        expect('error' in result).toBe(false);
        expect(queries.map((q) => q.table)).toEqual(['strategy_signals']);
        expect(consoleError).not.toHaveBeenCalled();
    });

    it('strategy_signals 查詢失敗：rows 為空、error 非空，且記錄錯誤', async () => {
        wireTables({ strategy_signals: { error: { message: 'connection refused' } } });

        const result = await getFanBreakoutSignals();

        expect(result.rows).toEqual([]);
        expect(result.latestDate).toBeNull();
        expect(result.error).toBeTruthy();
        expect(result.error).toContain('connection refused');
        expect(consoleError).toHaveBeenCalled();
    });

    it('名稱或價格查詢失敗同樣回傳 error，不假裝成功', async () => {
        const signals = {
            rows: [{ strategy_id: 'fan_breakout', is_selected: true, date: '2026-10-22', stock_id: '2330', score: 1, conditions: null }],
        };

        wireTables({ strategy_signals: signals, stock_basic_info: { error: { message: 'names down' } } });
        const namesFailed = await getFanBreakoutSignals();
        expect(namesFailed.rows).toEqual([]);
        expect(namesFailed.error).toContain('names down');

        wireTables({ strategy_signals: signals, stock_basic_info: { rows: [] }, stock_prices_daily: { error: { message: 'prices down' } } });
        const pricesFailed = await getFanBreakoutSignals();
        expect(pricesFailed.rows).toEqual([]);
        expect(pricesFailed.latestDate).toBeNull();
        expect(pricesFailed.error).toContain('prices down');
    });

    it('以 unstable_cache 包裝：key fan-breakout-signals-v1、revalidate 3600', async () => {
        wireTables({ strategy_signals: { rows: [] } });

        await getFanBreakoutSignals();

        expect(mockUnstableCache).toHaveBeenCalledWith(['fan-breakout-signals-v1'], { revalidate: 3600 });
    });
});
