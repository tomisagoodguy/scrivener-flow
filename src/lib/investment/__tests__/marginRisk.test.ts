/**
 * 融資使用率百分位：高融資判斷、曝險彙總、百分位查詢（change: margin-usage-percentile-risk）。
 * 涵蓋 spec：High margin holding badge、High margin exposure summary。
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import {
    HIGH_MARGIN_PCT,
    isHighMargin,
    summarizeMarginExposure,
    fetchMarginPctRanks,
} from '@/lib/investment/marginRisk';

describe('isHighMargin', () => {
    it('threshold is 80', () => {
        expect(HIGH_MARGIN_PCT).toBe(80);
    });

    it.each([
        [80, true],
        [80.0, true],
        [100, true],
        [79.9, false],
        [0, false],
        [null, false],
        [undefined, false],
    ])('pct=%p → %p', (pct, expected) => {
        expect(isHighMargin(pct)).toBe(expected);
    });
});

describe('summarizeMarginExposure', () => {
    it('spec example: 50 holdings, 6 high with weights summing to 9.4%', () => {
        const high = [2.0, 1.5, 1.5, 1.4, 1.5, 1.5].map(weight => ({ margin_pct_rank: 85, weight }));
        const low = Array.from({ length: 44 }, () => ({ margin_pct_rank: 40, weight: 2 }));
        const summary = summarizeMarginExposure([...high, ...low]);
        expect(summary.total).toBe(50);
        expect(summary.highCount).toBe(6);
        expect(summary.highWeight).toBeCloseTo(9.4, 6);
        expect(summary.unknownCount).toBe(0);
    });

    it('counts missing percentile as unknown, not high', () => {
        const summary = summarizeMarginExposure([
            { margin_pct_rank: 90 },
            { margin_pct_rank: null },
            { margin_pct_rank: undefined },
            {},
        ]);
        expect(summary).toEqual({ total: 4, highCount: 1, highWeight: 0, unknownCount: 3 });
    });

    it('treats missing weight of a high holding as 0', () => {
        const summary = summarizeMarginExposure([
            { margin_pct_rank: 95, weight: null },
            { margin_pct_rank: 80, weight: 3.2 },
        ]);
        expect(summary.highCount).toBe(2);
        expect(summary.highWeight).toBeCloseTo(3.2, 6);
    });

    it('empty input', () => {
        expect(summarizeMarginExposure([])).toEqual({ total: 0, highCount: 0, highWeight: 0, unknownCount: 0 });
    });
});

describe('fetchMarginPctRanks', () => {
    function fakeClient(result: { data: unknown[] | null; error: { message: string } | null }) {
        const calls: { method: string; args: unknown[] }[] = [];
        const builder: Record<string, unknown> = {};
        for (const m of ['select', 'in', 'order', 'limit']) {
            builder[m] = (...args: unknown[]) => {
                calls.push({ method: m, args });
                return builder;
            };
        }
        builder.then = (ok: (v: unknown) => unknown, fail?: (e: unknown) => unknown) =>
            Promise.resolve(result).then(ok, fail);
        const from = jest.fn(() => builder);
        return { client: { from } as unknown as SupabaseClient, from, calls };
    }

    it('returns {} without querying when codes is empty', async () => {
        const { client, from } = fakeClient({ data: [], error: null });
        await expect(fetchMarginPctRanks(client, [])).resolves.toEqual({});
        expect(from).not.toHaveBeenCalled();
    });

    it('takes the latest row per code and converts numeric strings', async () => {
        const { client, from, calls } = fakeClient({
            data: [
                { stock_code: '2330', data_date: '2026-10-30', margin_pct_rank: '91.2' },
                { stock_code: '1101', data_date: '2026-10-30', margin_pct_rank: null },
                { stock_code: '2330', data_date: '2026-10-29', margin_pct_rank: '40.0' },
                { stock_code: '1101', data_date: '2026-10-29', margin_pct_rank: '85.0' },
            ],
            error: null,
        });
        const result = await fetchMarginPctRanks(client, ['2330', '1101', '9999']);
        expect(result).toEqual({ '2330': 91.2, '1101': null });
        expect(from).toHaveBeenCalledWith('stock_prices_daily');
        expect(calls.find(c => c.method === 'limit')?.args[0]).toBe(6);
        expect(calls.find(c => c.method === 'order')?.args).toEqual(['data_date', { ascending: false }]);
    });

    it('rejects when the query errors (no silent empty result)', async () => {
        const { client } = fakeClient({ data: null, error: { message: 'boom' } });
        await expect(fetchMarginPctRanks(client, ['2330'])).rejects.toThrow('boom');
    });
});
