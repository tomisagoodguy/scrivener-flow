/**
 * Tests for etfPageData.getHoldings() date-fallback propagation.
 *
 * TDD: written BEFORE implementation. The page-level `getHoldings()` (used by
 * `src/app/investment/[etf]/page.tsx`) has its own inline candidate-date scan +
 * 0.5 price-coverage threshold logic, duplicated from `holdingsUtils.ts`. This
 * change replaces that duplication with the shared `selectDateWithFallback`
 * helper and propagates `isFallback` onto the return value and `meta`, so the
 * ETF holdings page can render the fallback notice (etf-holdings-date-fallback-flag).
 */

jest.mock('server-only', () => ({}), { virtual: true });
jest.mock('next/cache', () => ({
    unstable_cache: (fn: () => unknown) => fn,
}));

function makeChainBuilder(data: unknown[] | null, error: { message: string } | null = null) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder: any = {};
    ['select', 'eq', 'in', 'order', 'limit', 'gte', 'lte'].forEach((m) => {
        builder[m] = jest.fn(() => builder);
    });
    builder.then = (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
        Promise.resolve({ data, error }).then(onFulfilled, onRejected);
    return builder;
}

function makeServiceClient(opts: {
    dateCandidates: { data_date: string; updated_at: string }[];
    holdingsByDate: Record<string, { stock_code: string; price: number | null }[]>;
    priceRows?: { stock_code: string; data_date: string; margin_pct_rank: string | null }[];
    priceError?: { message: string };
}) {
    return {
        from: (table: string) => {
            if (table === 'etf_holdings_snapshot') {
                return {
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
                        return {
                            eq: () => ({
                                eq: (_col: string, date: string) => ({
                                    order: async () => ({ data: opts.holdingsByDate[date] ?? [] }),
                                }),
                            }),
                        };
                    },
                };
            }
            if (table === 'stock_prices_daily') {
                return makeChainBuilder(opts.priceError ? null : opts.priceRows ?? [], opts.priceError ?? null);
            }
            return makeChainBuilder([]);
        },
    };
}

const mockPublicClient = { from: () => makeChainBuilder([]) };

jest.mock('@/lib/supabase/service', () => ({
    getServiceClient: jest.fn(),
    getPublicClient: jest.fn(() => mockPublicClient),
}));
jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }));

import { getServiceClient } from '@/lib/supabase/service';
import { getHoldings } from '@/lib/investment/etfPageData';

describe('getHoldings (etfPageData) — isFallback propagation', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns isFallback: false and meta.isFallback: false when the latest date has sufficient price coverage', async () => {
        (getServiceClient as jest.Mock).mockReturnValue(
            makeServiceClient({
                dateCandidates: [
                    { data_date: '2026-07-10', updated_at: '2026-07-10T01:00:00Z' },
                    { data_date: '2026-07-09', updated_at: '2026-07-09T01:00:00Z' },
                ],
                holdingsByDate: {
                    '2026-07-10': [{ stock_code: 'A', price: 10 }, { stock_code: 'B', price: 20 }],
                },
            })
        );

        const result = await getHoldings('00981A');

        expect(result.dataDate).toBe('2026-07-10');
        expect(result.isFallback).toBe(false);
        expect(result.meta?.isFallback).toBe(false);
    });

    it('returns isFallback: true and meta.isFallback: true when it falls back to a prior date', async () => {
        (getServiceClient as jest.Mock).mockReturnValue(
            makeServiceClient({
                dateCandidates: [
                    { data_date: '2026-07-10', updated_at: '2026-07-10T01:00:00Z' },
                    { data_date: '2026-07-09', updated_at: '2026-07-09T01:00:00Z' },
                ],
                holdingsByDate: {
                    '2026-07-10': [{ stock_code: 'A', price: null }, { stock_code: 'B', price: null }],
                    '2026-07-09': [{ stock_code: 'A', price: 10 }, { stock_code: 'B', price: 20 }],
                },
            })
        );

        const result = await getHoldings('00981A');

        expect(result.dataDate).toBe('2026-07-09');
        expect(result.isFallback).toBe(true);
        expect(result.meta?.isFallback).toBe(true);
    });

    it('returns isFallback: false and meta: null when there are no candidate dates', async () => {
        (getServiceClient as jest.Mock).mockReturnValue(
            makeServiceClient({ dateCandidates: [], holdingsByDate: {} })
        );

        const result = await getHoldings('00981A');

        expect(result.dataDate).toBeNull();
        expect(result.isFallback).toBe(false);
        expect(result.meta).toBeNull();
    });
});

describe('getHoldings (etfPageData) — margin_pct_rank', () => {
    const base = {
        dateCandidates: [{ data_date: '2026-10-30', updated_at: '2026-10-30T01:00:00Z' }],
        holdingsByDate: {
            '2026-10-30': [{ stock_code: '2330', price: 1000 }, { stock_code: '1101', price: 40 }],
        },
    };

    beforeEach(() => jest.clearAllMocks());

    it('attaches the latest stock_prices_daily percentile to every holding', async () => {
        (getServiceClient as jest.Mock).mockReturnValue(
            makeServiceClient({
                ...base,
                priceRows: [
                    { stock_code: '2330', data_date: '2026-10-30', margin_pct_rank: '91.2' },
                    { stock_code: '2330', data_date: '2026-10-29', margin_pct_rank: '40.0' },
                ],
            })
        );

        const { holdings } = await getHoldings('00981A');
        const byCode = Object.fromEntries(holdings.map(h => [h.stock_code, h.margin_pct_rank]));
        expect(byCode).toEqual({ '2330': 91.2, '1101': null });
    });

    it('still returns holdings with null percentile when the percentile query fails', async () => {
        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
        (getServiceClient as jest.Mock).mockReturnValue(
            makeServiceClient({ ...base, priceError: { message: 'boom' } })
        );

        const { holdings } = await getHoldings('00981A');
        expect(holdings.map(h => h.stock_code)).toEqual(['2330', '1101']);
        expect(holdings.every(h => h.margin_pct_rank === null)).toBe(true);
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });
});
