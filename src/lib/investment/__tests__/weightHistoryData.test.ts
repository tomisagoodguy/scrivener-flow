import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchWeightHistory } from '../weightHistoryData';

type Call = [string, ...unknown[]];

/** 假 query builder：記錄所有鏈式呼叫，range 依 totalRows 回傳對應列數。 */
function fakeClient(totalRows: number) {
    const calls: Call[] = [];
    const ranges: Array<[number, number]> = [];
    const builder = {
        select: (cols: string) => (calls.push(['select', cols]), builder),
        in: (col: string, vals: unknown) => (calls.push(['in', col, vals]), builder),
        eq: (col: string, val: unknown) => (calls.push(['eq', col, val]), builder),
        gte: (col: string, val: unknown) => (calls.push(['gte', col, val]), builder),
        order: (col: string) => (calls.push(['order', col]), builder),
        range: async (from: number, to: number) => {
            ranges.push([from, to]);
            const end = Math.min(to, totalRows - 1);
            const data = end >= from ? Array.from({ length: end - from + 1 }, (_, i) => ({ n: from + i })) : [];
            return { data, error: null };
        },
    };
    const tables: string[] = [];
    const client = {
        from: (table: string) => {
            tables.push(table);
            calls.length = 0; // 每頁重新建 query，只保留最後一頁的呼叫鏈
            return builder;
        },
    };
    return { client: client as unknown as SupabaseClient, calls, ranges, tables };
}

describe('fetchWeightHistory', () => {
    it('orders by data_date, etf_code, stock_code in that order', async () => {
        const fake = fakeClient(1);
        await fetchWeightHistory(fake.client, { etfCodes: ['00981A'] }, 'data_date, weight');
        const orders = fake.calls.filter(c => c[0] === 'order').map(c => c[1]);
        expect(orders).toEqual(['data_date', 'etf_code', 'stock_code']);
        expect(fake.tables[0]).toBe('etf_weight_history');
        expect(fake.calls[0]).toEqual(['select', 'data_date, weight']);
    });

    it('applies only the filters that have values', async () => {
        const none = fakeClient(1);
        await fetchWeightHistory(none.client, {}, 'data_date');
        expect(none.calls.filter(c => ['in', 'eq', 'gte'].includes(c[0]))).toEqual([]);

        const all = fakeClient(1);
        await fetchWeightHistory(
            all.client,
            { etfCodes: ['00981A', '00980A'], stockCode: '2330', fromDate: '2026-08-17' },
            'data_date',
        );
        expect(all.calls.filter(c => ['in', 'eq', 'gte'].includes(c[0]))).toEqual([
            ['in', 'etf_code', ['00981A', '00980A']],
            ['eq', 'stock_code', '2330'],
            ['gte', 'data_date', '2026-08-17'],
        ]);
    });

    it('treats an empty etfCodes array as no filter', async () => {
        const fake = fakeClient(1);
        await fetchWeightHistory(fake.client, { etfCodes: [] }, 'data_date');
        expect(fake.calls.some(c => c[0] === 'in')).toBe(false);
    });

    it('paginates in concurrent batches of 4 pages', async () => {
        const fake = fakeClient(2905);
        const rows = await fetchWeightHistory<{ n: number }>(fake.client, { stockCode: '2330' }, 'data_date');
        expect([...fake.ranges].sort((a, b) => a[0] - b[0])).toEqual([[0, 999], [1000, 1999], [2000, 2999], [3000, 3999]]);
        expect(rows).toHaveLength(2905);
        rows.forEach((r, i) => expect(r.n).toBe(i));
    });
});
