/**
 * Tests for fan-breakout pure helpers (change: fan-breakout-screener, task 4.1).
 *
 * TDD: written BEFORE implementation. Covers spec scenarios/examples:
 *   - Performance since signal (return, high/low window table, missing signal-date close)
 *   - Client-side filters (signal type + market, min consecutive days, date range)
 *   - Pagination (45 rows -> 20/20/5)
 *   - conditions JSON parsing (object / JSON string / null / invalid fields)
 */

import {
    computePerformance,
    filterRows,
    paginate,
    parseFanBreakoutConditions,
    sortFanBreakoutRows,
    DEFAULT_FAN_BREAKOUT_FILTERS,
    FAN_BREAKOUT_PAGE_SIZE,
    type DailyPrice,
    type FanBreakoutRow,
} from '@/lib/investment/fanBreakout';

function makeRow(overrides: Partial<FanBreakoutRow> = {}): FanBreakoutRow {
    return {
        date: '2026-10-22',
        stockId: '2330',
        name: '台積電',
        score: 0.1,
        signalType: 'first',
        consecDays: 1,
        spread: 0.1,
        market: '上市',
        recentSignalDates: ['2026-10-22'],
        signalClose: null,
        latestClose: null,
        latestDate: null,
        returnSinceSignal: null,
        highSinceSignal: null,
        lowSinceSignal: null,
        ...overrides,
    };
}

describe('parseFanBreakoutConditions', () => {
    const valid = {
        signal_type: 'repeat',
        consec_days: 3,
        spread: 0.1834,
        market: '上櫃',
        recent_signal_dates: ['2026-09-30', '2026-10-22'],
    };

    it('parses a conditions object', () => {
        expect(parseFanBreakoutConditions(valid)).toEqual({
            signalType: 'repeat',
            consecDays: 3,
            spread: 0.1834,
            market: '上櫃',
            recentSignalDates: ['2026-09-30', '2026-10-22'],
        });
    });

    it('parses a JSON string', () => {
        expect(parseFanBreakoutConditions(JSON.stringify(valid))).toEqual({
            signalType: 'repeat',
            consecDays: 3,
            spread: 0.1834,
            market: '上櫃',
            recentSignalDates: ['2026-09-30', '2026-10-22'],
        });
    });

    it.each([null, undefined, 42, true, [], '', 'not json', '"str"', '[1,2]', 'null'])(
        'returns all-empty values for non-object input %p without throwing',
        (raw) => {
            expect(parseFanBreakoutConditions(raw)).toEqual({
                signalType: null,
                consecDays: null,
                spread: null,
                market: null,
                recentSignalDates: [],
            });
        },
    );

    it('nulls each invalid field independently and keeps valid ones', () => {
        const parsed = parseFanBreakoutConditions({
            signal_type: 'weird',
            consec_days: 0,
            spread: 'abc',
            market: '興櫃',
            recent_signal_dates: 'nope',
        });
        expect(parsed).toEqual({
            signalType: null,
            consecDays: null,
            spread: null,
            market: null,
            recentSignalDates: [],
        });

        const partial = parseFanBreakoutConditions({ ...valid, spread: null, market: null });
        expect(partial.signalType).toBe('repeat');
        expect(partial.consecDays).toBe(3);
        expect(partial.spread).toBeNull();
        expect(partial.market).toBeNull();
    });

    it('rejects non-integer, negative and non-finite consec_days / spread', () => {
        expect(parseFanBreakoutConditions({ consec_days: 2.5 }).consecDays).toBeNull();
        expect(parseFanBreakoutConditions({ consec_days: -1 }).consecDays).toBeNull();
        expect(parseFanBreakoutConditions({ consec_days: '3' }).consecDays).toBeNull();
        expect(parseFanBreakoutConditions({ spread: Number.NaN }).spread).toBeNull();
        expect(parseFanBreakoutConditions({ spread: Infinity }).spread).toBeNull();
        expect(parseFanBreakoutConditions({ spread: -0.02 }).spread).toBe(-0.02);
    });

    it('drops malformed entries from recent_signal_dates', () => {
        const parsed = parseFanBreakoutConditions({
            recent_signal_dates: ['2026-09-30', 20261022, null, '10/22', '2026-10-22'],
        });
        expect(parsed.recentSignalDates).toEqual(['2026-09-30', '2026-10-22']);
    });
});

describe('computePerformance', () => {
    // Spec example: high and low window (signal = 10-01)
    const table: DailyPrice[] = [
        { date: '2026-10-01', high: 102, low: 98, close: 100 },
        { date: '2026-10-02', high: 108, low: 101, close: 106 },
        { date: '2026-10-03', high: 107, low: 95, close: 97 },
    ];

    it('high/low window example: high 108, low 95, return -0.03', () => {
        const perf = computePerformance(table, '2026-10-01');
        expect(perf.highSinceSignal).toBe(108);
        expect(perf.lowSinceSignal).toBe(95);
        expect(perf.returnSinceSignal).toBe(-0.03);
        expect(perf.signalClose).toBe(100);
        expect(perf.latestClose).toBe(97);
        expect(perf.latestDate).toBe('2026-10-03');
    });

    it('return computed: signal close 100, latest close 112 -> 0.12', () => {
        const perf = computePerformance(
            [
                { date: '2026-10-01', high: 101, low: 99, close: 100 },
                { date: '2026-10-02', high: 113, low: 105, close: 112 },
            ],
            '2026-10-01',
        );
        expect(perf.returnSinceSignal).toBe(0.12);
    });

    it('ignores rows before the signal date and does not depend on input order', () => {
        const shuffled: DailyPrice[] = [
            { date: '2026-10-03', high: 107, low: 95, close: 97 },
            { date: '2026-09-29', high: 500, low: 1, close: 300 },
            { date: '2026-10-01', high: 102, low: 98, close: 100 },
            { date: '2026-10-02', high: 108, low: 101, close: 106 },
        ];
        const perf = computePerformance(shuffled, '2026-10-01');
        expect(perf.highSinceSignal).toBe(108);
        expect(perf.lowSinceSignal).toBe(95);
        expect(perf.latestDate).toBe('2026-10-03');
    });

    it('price missing on the signal date -> every field null', () => {
        const perf = computePerformance(
            [
                { date: '2026-10-02', high: 108, low: 101, close: 106 },
                { date: '2026-10-03', high: 107, low: 95, close: 97 },
            ],
            '2026-10-01',
        );
        expect(perf).toEqual({
            signalClose: null,
            latestClose: null,
            latestDate: null,
            returnSinceSignal: null,
            highSinceSignal: null,
            lowSinceSignal: null,
        });
    });

    it('signal-date row exists but close is null -> every field null', () => {
        const perf = computePerformance(
            [
                { date: '2026-10-01', high: 102, low: 98, close: null },
                { date: '2026-10-02', high: 108, low: 101, close: 106 },
            ],
            '2026-10-01',
        );
        expect(perf.signalClose).toBeNull();
        expect(perf.returnSinceSignal).toBeNull();
        expect(perf.highSinceSignal).toBeNull();
        expect(perf.lowSinceSignal).toBeNull();
        expect(perf.latestClose).toBeNull();
        expect(perf.latestDate).toBeNull();
    });

    it('empty price list or zero signal close -> every field null (no divide by zero)', () => {
        expect(computePerformance([], '2026-10-01').returnSinceSignal).toBeNull();
        const zero = computePerformance([{ date: '2026-10-01', high: 1, low: 0, close: 0 }], '2026-10-01');
        expect(zero.signalClose).toBeNull();
        expect(zero.returnSinceSignal).toBeNull();
    });

    it('signal date is also the latest date -> return 0, high/low from that bar', () => {
        const perf = computePerformance([{ date: '2026-10-01', high: 102, low: 98, close: 100 }], '2026-10-01');
        expect(perf.returnSinceSignal).toBe(0);
        expect(perf.highSinceSignal).toBe(102);
        expect(perf.lowSinceSignal).toBe(98);
        expect(perf.latestDate).toBe('2026-10-01');
    });

    it('latest close skips trailing bars whose close is null; high/low stop at latestDate', () => {
        const perf = computePerformance(
            [
                { date: '2026-10-01', high: 102, low: 98, close: 100 },
                { date: '2026-10-02', high: 108, low: 101, close: 106 },
                { date: '2026-10-03', high: 999, low: 1, close: null },
            ],
            '2026-10-01',
        );
        expect(perf.latestDate).toBe('2026-10-02');
        expect(perf.latestClose).toBe(106);
        expect(perf.highSinceSignal).toBe(108);
        expect(perf.lowSinceSignal).toBe(98);
    });

    it('null high/low on a bar are skipped rather than treated as zero', () => {
        const perf = computePerformance(
            [
                { date: '2026-10-01', high: null, low: null, close: 100 },
                { date: '2026-10-02', high: 108, low: 101, close: 106 },
            ],
            '2026-10-01',
        );
        expect(perf.highSinceSignal).toBe(108);
        expect(perf.lowSinceSignal).toBe(101);
    });

    it('high/low are null when no bar in the window carries them', () => {
        const perf = computePerformance([{ date: '2026-10-01', high: null, low: null, close: 100 }], '2026-10-01');
        expect(perf.highSinceSignal).toBeNull();
        expect(perf.lowSinceSignal).toBeNull();
        expect(perf.returnSinceSignal).toBe(0);
    });
});

describe('filterRows', () => {
    const rows: FanBreakoutRow[] = [
        makeRow({ stockId: '1101', date: '2026-10-22', signalType: 'first', consecDays: 1, market: '上市' }),
        makeRow({ stockId: '6488', date: '2026-10-22', signalType: 'first', consecDays: 2, market: '上櫃' }),
        makeRow({ stockId: '3105', date: '2026-10-15', signalType: 'repeat', consecDays: 3, market: '上櫃' }),
        makeRow({ stockId: '2330', date: '2026-10-01', signalType: 'repeat', consecDays: 5, market: '上市' }),
        makeRow({ stockId: '9999', date: '2026-10-10', signalType: null, consecDays: null, market: null }),
    ];
    const ids = (rs: FanBreakoutRow[]) => rs.map((r) => r.stockId);

    it('default filters keep every row, including rows with null conditions', () => {
        expect(ids(filterRows(rows, DEFAULT_FAN_BREAKOUT_FILTERS))).toEqual(ids(rows));
    });

    it('首次 + 上櫃 keeps only signalType first and market 上櫃', () => {
        const out = filterRows(rows, { ...DEFAULT_FAN_BREAKOUT_FILTERS, signalType: 'first', market: '上櫃' });
        expect(ids(out)).toEqual(['6488']);
    });

    it('signal type 再次 keeps only repeat rows', () => {
        const out = filterRows(rows, { ...DEFAULT_FAN_BREAKOUT_FILTERS, signalType: 'repeat' });
        expect(ids(out)).toEqual(['3105', '2330']);
    });

    it('minimum consecutive days 3 keeps consecDays >= 3 (null excluded)', () => {
        const out = filterRows(rows, { ...DEFAULT_FAN_BREAKOUT_FILTERS, minConsecDays: 3 });
        expect(ids(out)).toEqual(['3105', '2330']);
    });

    it('minimum consecutive days 1 or 0 does not drop null-conditions rows', () => {
        expect(filterRows(rows, { ...DEFAULT_FAN_BREAKOUT_FILTERS, minConsecDays: 1 })).toHaveLength(5);
        expect(filterRows(rows, { ...DEFAULT_FAN_BREAKOUT_FILTERS, minConsecDays: 0 })).toHaveLength(5);
    });

    it('date range is inclusive on both ends and open when null', () => {
        const range = filterRows(rows, { ...DEFAULT_FAN_BREAKOUT_FILTERS, dateFrom: '2026-10-10', dateTo: '2026-10-15' });
        expect(ids(range)).toEqual(['3105', '9999']);

        const fromOnly = filterRows(rows, { ...DEFAULT_FAN_BREAKOUT_FILTERS, dateFrom: '2026-10-22' });
        expect(ids(fromOnly)).toEqual(['1101', '6488']);

        const toOnly = filterRows(rows, { ...DEFAULT_FAN_BREAKOUT_FILTERS, dateTo: '2026-10-01' });
        expect(ids(toOnly)).toEqual(['2330']);
    });

    it('treats empty-string dates as unbounded (native date input cleared)', () => {
        const out = filterRows(rows, { ...DEFAULT_FAN_BREAKOUT_FILTERS, dateFrom: '', dateTo: '' });
        expect(out).toHaveLength(5);
    });

    it('does not mutate the input array and preserves row order', () => {
        const copy = [...rows];
        filterRows(rows, { ...DEFAULT_FAN_BREAKOUT_FILTERS, market: '上市' });
        expect(rows).toEqual(copy);
    });
});

describe('sortFanBreakoutRows', () => {
    it('orders by date desc, then score desc (null score last), then stockId asc', () => {
        const rows = [
            makeRow({ stockId: 'B', date: '2026-10-21', score: 0.9 }),
            makeRow({ stockId: 'C', date: '2026-10-22', score: 0.1 }),
            makeRow({ stockId: 'A', date: '2026-10-22', score: 0.3 }),
            makeRow({ stockId: 'D', date: '2026-10-22', score: null }),
            makeRow({ stockId: 'E', date: '2026-10-22', score: 0.1 }),
        ];
        const sorted = sortFanBreakoutRows(rows);
        expect(sorted.map((r) => r.stockId)).toEqual(['A', 'C', 'E', 'D', 'B']);
        // does not mutate
        expect(rows.map((r) => r.stockId)).toEqual(['B', 'C', 'A', 'D', 'E']);
    });
});

describe('paginate', () => {
    const items = Array.from({ length: 45 }, (_, i) => i + 1);

    it('uses 20 rows per page by default', () => {
        expect(FAN_BREAKOUT_PAGE_SIZE).toBe(20);
    });

    it('45 rows -> 3 pages of 20, 20 and 5', () => {
        const p1 = paginate(items, 1);
        const p2 = paginate(items, 2);
        const p3 = paginate(items, 3);
        expect(p1.totalPages).toBe(3);
        expect([p1.items.length, p2.items.length, p3.items.length]).toEqual([20, 20, 5]);
        expect(p1.items[0]).toBe(1);
        expect(p2.items[0]).toBe(21);
        expect(p3.items[0]).toBe(41);
        expect(p3.items[4]).toBe(45);
        expect(p1.total).toBe(45);
    });

    it('exact multiple of page size has no trailing empty page', () => {
        const p = paginate(Array.from({ length: 40 }, (_, i) => i), 2);
        expect(p.totalPages).toBe(2);
        expect(p.items).toHaveLength(20);
    });

    it('clamps out-of-range pages into [1, totalPages]', () => {
        expect(paginate(items, 0).page).toBe(1);
        expect(paginate(items, -4).page).toBe(1);
        expect(paginate(items, 99).page).toBe(3);
        expect(paginate(items, 99).items).toHaveLength(5);
        expect(paginate(items, Number.NaN).page).toBe(1);
    });

    it('empty input -> page 1 of 1 with no items', () => {
        expect(paginate([], 1)).toEqual({ items: [], page: 1, totalPages: 1, total: 0 });
    });

    it('supports a custom page size', () => {
        const p = paginate(items, 2, 10);
        expect(p.totalPages).toBe(5);
        expect(p.items[0]).toBe(11);
    });
});
