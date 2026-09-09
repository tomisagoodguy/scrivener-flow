/**
 * Tests for the shared date-fallback selection helper and getHoldingsForEtf().
 *
 * TDD: written BEFORE implementation. Covers the spec scenarios of
 * "getHoldingsForEtf returns explicit fallback flag" and
 * "Shared date-fallback selection helper":
 *   1. latest date has sufficient price coverage → isFallback: false
 *   2. latest date insufficient, prior date sufficient → isFallback: true
 *   3. no candidate dates → { dataDate: null, isFallback: false }
 */

import { selectDateWithFallback, getHoldingsForEtf } from '@/lib/investment/holdingsUtils';

describe('selectDateWithFallback', () => {
    it('returns the latest date with isFallback: false when price coverage is sufficient', async () => {
        const dateCandidates = [{ data_date: '2026-07-10' }, { data_date: '2026-07-09' }];
        const fetchForDate = jest.fn(async (date: string) => {
            if (date === '2026-07-10') {
                return [{ price: 10 }, { price: 20 }, { price: null }];
            }
            throw new Error('should not fetch prior date');
        });

        const result = await selectDateWithFallback(dateCandidates, fetchForDate);

        expect(result.dataDate).toBe('2026-07-10');
        expect(result.isFallback).toBe(false);
        expect(fetchForDate).toHaveBeenCalledTimes(1);
    });

    it('falls back to the prior date with isFallback: true when the latest date has insufficient price coverage', async () => {
        const dateCandidates = [{ data_date: '2026-07-10' }, { data_date: '2026-07-09' }];
        const fetchForDate = jest.fn(async (date: string) => {
            if (date === '2026-07-10') return [{ price: null }, { price: null }, { price: 5 }];
            if (date === '2026-07-09') return [{ price: 5 }, { price: 6 }, { price: 7 }];
            return [];
        });

        const result = await selectDateWithFallback(dateCandidates, fetchForDate);

        expect(result.dataDate).toBe('2026-07-09');
        expect(result.isFallback).toBe(true);
        expect(fetchForDate).toHaveBeenCalledTimes(2);
    });

    it('returns { dataDate: null, isFallback: false } when no candidate dates exist', async () => {
        const fetchForDate = jest.fn(async () => []);

        const result = await selectDateWithFallback([], fetchForDate);

        expect(result.dataDate).toBeNull();
        expect(result.isFallback).toBe(false);
        expect(fetchForDate).not.toHaveBeenCalled();
    });

    it('does not fall back when only one candidate date exists, even if coverage is insufficient', async () => {
        const dateCandidates = [{ data_date: '2026-07-10' }];
        const fetchForDate = jest.fn(async () => [{ price: null }, { price: null }]);

        const result = await selectDateWithFallback(dateCandidates, fetchForDate);

        expect(result.dataDate).toBe('2026-07-10');
        expect(result.isFallback).toBe(false);
    });
});

/** Minimal fake Supabase query builder covering the chains getHoldingsForEtf() uses. */
function makeFakeSupabase(opts: {
    dateCandidates: { data_date: string; updated_at?: string }[];
    holdingsByDate: Record<string, { stock_code: string; price: number | null }[]>;
}) {
    return {
        from: (_table: string) => ({
            select: (cols: string) => {
                if (cols === 'data_date, updated_at') {
                    return {
                        eq: () => ({
                            order: () => ({
                                order: () => ({
                                    limit: async () => ({ data: opts.dateCandidates }),
                                }),
                            }),
                        }),
                    };
                }
                // '*' holdings-per-date fetch
                return {
                    eq: () => ({
                        eq: (_col: string, date: string) => ({
                            order: async () => ({ data: opts.holdingsByDate[date] ?? [] }),
                        }),
                    }),
                };
            },
        }),
    };
}

describe('getHoldingsForEtf', () => {
    it('returns isFallback: false when the latest date has sufficient price coverage', async () => {
        const supabase = makeFakeSupabase({
            dateCandidates: [{ data_date: '2026-07-10' }, { data_date: '2026-07-09' }],
            holdingsByDate: {
                '2026-07-10': [{ stock_code: 'A', price: 10 }, { stock_code: 'B', price: 20 }],
            },
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await getHoldingsForEtf('00981A', supabase as any, null);

        expect(result.dataDate).toBe('2026-07-10');
        expect(result.isFallback).toBe(false);
        expect(result.holdings).toHaveLength(2);
    });

    it('returns isFallback: true when it falls back to a prior date', async () => {
        const supabase = makeFakeSupabase({
            dateCandidates: [{ data_date: '2026-07-10' }, { data_date: '2026-07-09' }],
            holdingsByDate: {
                '2026-07-10': [{ stock_code: 'A', price: null }, { stock_code: 'B', price: null }],
                '2026-07-09': [{ stock_code: 'A', price: 10 }, { stock_code: 'B', price: 20 }],
            },
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await getHoldingsForEtf('00981A', supabase as any, null);

        expect(result.dataDate).toBe('2026-07-09');
        expect(result.isFallback).toBe(true);
    });

    it('returns { dataDate: null, isFallback: false } when there are no candidate dates', async () => {
        const supabase = makeFakeSupabase({ dateCandidates: [], holdingsByDate: {} });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await getHoldingsForEtf('00981A', supabase as any, null);

        expect(result.dataDate).toBeNull();
        expect(result.isFallback).toBe(false);
        expect(result.holdings).toEqual([]);
    });

    it('returns isFallback: false when a canonicalDate is passed explicitly (no candidate scan)', async () => {
        const supabase = makeFakeSupabase({
            dateCandidates: [],
            holdingsByDate: {},
        });
        // canonicalDate path uses a plain select without the candidate scan; extend the fake for '*' select
        const supabaseWithCanonical = {
            from: () => ({
                select: () => ({
                    eq: () => ({
                        eq: () => ({
                            order: async () => ({ data: [{ stock_code: 'A', price: 10 }] }),
                        }),
                    }),
                }),
            }),
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await getHoldingsForEtf('00981A', supabaseWithCanonical as any, '2026-07-10');

        expect(result.dataDate).toBe('2026-07-10');
        expect(result.isFallback).toBe(false);
        void supabase;
    });
});
