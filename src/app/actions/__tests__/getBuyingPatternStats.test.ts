/**
 * Tests for getBuyingPatternStats (change: buying-pattern-baseline-ci, task 3.1).
 *
 * Spec: Stats read with verdict
 *   - Verdict classification（四種判定）
 *   - Query failure is not cached（快取函式內 throw、外層回 []）
 */

const cachedFns: Array<() => Promise<unknown>> = [];
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

import { getBuyingPatternStats } from '../getBuyingPatternStats';
import { classifyExcess, toPatternStats, type PatternStatsRow } from '@/lib/investment/buyingPatternStats';

function row(overrides: Partial<PatternStatsRow>): PatternStatsRow {
    return {
        pattern_type: 'window_break',
        horizon: 20,
        n: 759,
        n_weeks: 21,
        win_rate: 0.506,
        avg_return: 0.0203,
        baseline_n: 25667,
        baseline_win_rate: 0.573,
        baseline_avg_return: 0.0398,
        excess_win_lo: -0.1,
        excess_win_hi: -0.03,
        excess_ret_lo: -0.0289,
        excess_ret_hi: -0.0111,
        period_start: '2026-05-04',
        period_end: '2026-10-30',
        ...overrides,
    };
}

function mockQuery(result: { data: unknown; error: { message: string } | null }) {
    const order = jest.fn().mockReturnThis();
    const builder = { select: jest.fn().mockReturnThis(), order, then: undefined as unknown };
    builder.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
    mockFrom.mockReturnValue(builder);
    return builder;
}

describe('classifyExcess', () => {
    it.each([
        [[0.01, 0.05], 'better'],
        [[-0.04, -0.002], 'worse'],
        [[-0.01, 0.03], 'indistinguishable'],
        [null, 'insufficient'],
    ] as const)('%p → %s', (interval, expected) => {
        expect(classifyExcess(interval ? [interval[0], interval[1]] : null)).toBe(expected);
    });
});

describe('toPatternStats', () => {
    it('groups rows by pattern with legacy maps and byHorizon comparison', () => {
        const stats = toPatternStats([
            row({ horizon: 5, n: 1142 }),
            row({ horizon: 20 }),
            row({ pattern_type: 'sustained_buy', horizon: 20, n: 11, excess_win_lo: null, excess_win_hi: null, excess_ret_lo: null, excess_ret_hi: null }),
        ]);

        const wb = stats.find(s => s.patternType === 'window_break');
        expect(wb?.n).toBe(1142);
        expect(wb?.avgReturns['20']).toBe(0.0203);
        expect(wb?.winRates['5']).toBe(0.506);
        expect(wb?.byHorizon['20']).toEqual({
            n: 759,
            winRate: 0.506,
            avgReturn: 0.0203,
            baselineWinRate: 0.573,
            baselineAvgReturn: 0.0398,
            excessWin: [-0.1, -0.03],
            excessRet: [-0.0289, -0.0111],
            verdict: 'worse',
        });
        expect(wb?.periodStart).toBe('2026-05-04');
        expect(wb?.periodEnd).toBe('2026-10-30');

        const sb = stats.find(s => s.patternType === 'sustained_buy');
        expect(sb?.byHorizon['20'].excessRet).toBeNull();
        expect(sb?.byHorizon['20'].verdict).toBe('insufficient');
    });
});

describe('getBuyingPatternStats', () => {
    beforeEach(() => {
        mockFrom.mockReset();
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('reads etf_buying_pattern_stats', async () => {
        mockQuery({ data: [row({})], error: null });
        const stats = await getBuyingPatternStats();
        expect(mockFrom).toHaveBeenCalledWith('etf_buying_pattern_stats');
        expect(stats).toHaveLength(1);
        expect(stats[0].byHorizon['20'].verdict).toBe('worse');
    });

    it('query failure throws inside the cache and returns [] outside', async () => {
        mockQuery({ data: null, error: { message: 'boom' } });
        await expect(cachedFns[cachedFns.length - 1]()).rejects.toThrow('boom');
        await expect(getBuyingPatternStats()).resolves.toEqual([]);
    });
});
