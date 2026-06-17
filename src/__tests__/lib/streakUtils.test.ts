/**
 * Tests for streakUtils — trading-day-axis gaps-and-islands streak computation.
 *
 * TDD: Written BEFORE implementation. Encodes design decisions 1–3:
 * - 連續以「ETF 回報日序號」為軸,停手(該回報日無異動)或反向即斷
 * - 方向以 diff_shares 正負判定
 * - 「進行中」= streak 最後序號 == 該 ETF 軸的最新序號
 */

import {
    MIN_STREAK_DAYS,
    computeAvgPace,
    isSparseSource,
    computeStreaks,
    type DiffEvent,
} from '@/lib/investment/streakUtils';

describe('MIN_STREAK_DAYS', () => {
    it('is 3', () => {
        expect(MIN_STREAK_DAYS).toBe(3);
    });
});

describe('computeAvgPace', () => {
    it('returns net shares divided by streak days', () => {
        expect(computeAvgPace(500, 5)).toBe(100);
    });

    it('keeps sign for sell streaks (negative net)', () => {
        expect(computeAvgPace(-300, 3)).toBe(-100);
    });

    it('returns 0 when streakDays is 0 (no divide-by-zero)', () => {
        expect(computeAvgPace(100, 0)).toBe(0);
    });
});

describe('isSparseSource', () => {
    it('returns true for pocket-sourced ETF (00998A)', () => {
        expect(isSparseSource('00998A')).toBe(true);
    });

    it('returns false for official_api ETF (00981A)', () => {
        expect(isSparseSource('00981A')).toBe(false);
    });

    it('returns false for unknown ETF code', () => {
        expect(isSparseSource('99999X')).toBe(false);
    });
});

describe('computeStreaks', () => {
    // ── Fixture ──────────────────────────────────────────────────────────
    // 00993A reporting-day axis = 2026-06-01 .. 06-05 (d1..d5), max = d5
    //   1111: buys d1..d5  → buy streak 5, ends d5 (in-progress)
    //   5555: sells d3,d4,d5 → sell streak 3, ends d5 (in-progress)
    //   3333: +,+,-,+,+  → reversal at d3 breaks; current run buy{d4,d5} len2 (<MIN)
    //   4444: +,+,+,gap,+ → gap at d4 breaks; current run buy{d5} len1 (<MIN)
    // 00981A reporting-day axis = 2026-05-20 .. 05-22 (e1..e3), max = e3
    //   1111: buys e1..e3 → buy streak 3, ends e3 (per-ETF latest → in-progress)
    const d = (n: number) => `2026-06-0${n}`;

    const events: DiffEvent[] = [
        // 00993A — stock 1111 buys all 5 days
        { etf_code: '00993A', stock_code: '1111', stock_name: 'AlphaCo', data_date: d(1), diff_shares: 100 },
        { etf_code: '00993A', stock_code: '1111', stock_name: 'AlphaCo', data_date: d(2), diff_shares: 100 },
        { etf_code: '00993A', stock_code: '1111', stock_name: 'AlphaCo', data_date: d(3), diff_shares: 100 },
        { etf_code: '00993A', stock_code: '1111', stock_name: 'AlphaCo', data_date: d(4), diff_shares: 100 },
        { etf_code: '00993A', stock_code: '1111', stock_name: 'AlphaCo', data_date: d(5), diff_shares: 100 },
        // 00993A — stock 5555 sells last 3 days
        { etf_code: '00993A', stock_code: '5555', stock_name: 'EchoCo', data_date: d(3), diff_shares: -100 },
        { etf_code: '00993A', stock_code: '5555', stock_name: 'EchoCo', data_date: d(4), diff_shares: -100 },
        { etf_code: '00993A', stock_code: '5555', stock_name: 'EchoCo', data_date: d(5), diff_shares: -100 },
        // 00993A — stock 3333 reverses at d3
        { etf_code: '00993A', stock_code: '3333', stock_name: 'CharCo', data_date: d(1), diff_shares: 100 },
        { etf_code: '00993A', stock_code: '3333', stock_name: 'CharCo', data_date: d(2), diff_shares: 100 },
        { etf_code: '00993A', stock_code: '3333', stock_name: 'CharCo', data_date: d(3), diff_shares: -100 },
        { etf_code: '00993A', stock_code: '3333', stock_name: 'CharCo', data_date: d(4), diff_shares: 100 },
        { etf_code: '00993A', stock_code: '3333', stock_name: 'CharCo', data_date: d(5), diff_shares: 100 },
        // 00993A — stock 4444 has a gap at d4 (no event), other stocks keep d4 on the axis
        { etf_code: '00993A', stock_code: '4444', stock_name: 'DeltaCo', data_date: d(1), diff_shares: 100 },
        { etf_code: '00993A', stock_code: '4444', stock_name: 'DeltaCo', data_date: d(2), diff_shares: 100 },
        { etf_code: '00993A', stock_code: '4444', stock_name: 'DeltaCo', data_date: d(3), diff_shares: 100 },
        { etf_code: '00993A', stock_code: '4444', stock_name: 'DeltaCo', data_date: d(5), diff_shares: 100 },
        // 00981A — stock 1111 buys e1..e3 (axis local to 00981A, earlier than 00993A's max)
        { etf_code: '00981A', stock_code: '1111', stock_name: 'AlphaCo', data_date: '2026-05-20', diff_shares: 50 },
        { etf_code: '00981A', stock_code: '1111', stock_name: 'AlphaCo', data_date: '2026-05-21', diff_shares: 50 },
        { etf_code: '00981A', stock_code: '1111', stock_name: 'AlphaCo', data_date: '2026-05-22', diff_shares: 50 },
    ];

    const result = computeStreaks(events);

    it('asOfDate is the global latest data_date', () => {
        expect(result.asOfDate).toBe('2026-06-05');
    });

    it('etfBuy contains in-progress buy streaks >= MIN, sorted by streak_days desc', () => {
        // Expect 1111@00993A (5) then 1111@00981A (3); 3333 & 4444 excluded
        expect(result.etfBuy.map(r => `${r.stock_code}@${r.etf_code}:${r.streak_days}`)).toEqual([
            '1111@00993A:5',
            '1111@00981A:3',
        ]);
    });

    it('reversal breaks the streak (3333 current run is len 2, excluded)', () => {
        expect(result.etfBuy.some(r => r.stock_code === '3333')).toBe(false);
    });

    it('a gap on the ETF axis breaks the streak (4444 current run is len 1, excluded)', () => {
        expect(result.etfBuy.some(r => r.stock_code === '4444')).toBe(false);
    });

    it('etfSell contains the in-progress sell streak (5555, 3 days)', () => {
        expect(result.etfSell.map(r => `${r.stock_code}:${r.streak_days}:${r.direction}`)).toEqual([
            '5555:3:sell',
        ]);
        expect(result.etfSell[0].net_shares).toBe(-300);
    });

    it('buy rows carry direction "buy" and positive net_shares', () => {
        const top = result.etfBuy[0];
        expect(top.direction).toBe('buy');
        expect(top.net_shares).toBe(500);
        expect(top.start_date).toBe('2026-06-01');
        expect(top.end_date).toBe('2026-06-05');
        expect(top.avg_shares_per_day).toBe(100);
    });

    it('stockBuy collapses cross-ETF duplicates to the longest in-progress streak per stock', () => {
        // 1111 is in-progress buy on both 00993A (5) and 00981A (3) → keep the 5
        const stock1111 = result.stockBuy.filter(r => r.stock_code === '1111');
        expect(stock1111).toHaveLength(1);
        expect(stock1111[0].streak_days).toBe(5);
        expect(stock1111[0].etf_code).toBe('00993A');
    });

    it('stockSell has one row for 5555', () => {
        expect(result.stockSell.map(r => `${r.stock_code}:${r.streak_days}`)).toEqual(['5555:3']);
    });

    it('flags pocket-sourced ETFs via is_sparse_source', () => {
        // all fixture ETFs are official_api → false
        expect(result.etfBuy.every(r => r.is_sparse_source === false)).toBe(true);
    });

    it('returns empty result for empty input', () => {
        const empty = computeStreaks([]);
        expect(empty.etfBuy).toEqual([]);
        expect(empty.etfSell).toEqual([]);
        expect(empty.stockBuy).toEqual([]);
        expect(empty.stockSell).toEqual([]);
        expect(empty.asOfDate).toBe('');
    });
});
