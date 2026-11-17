import { fetchAllRows } from '../fetchAllRows';

/** 模擬一個符合 matching 列數的查詢，記錄每次請求的範圍。 */
function fakeSource(matching: number) {
    const ranges: Array<[number, number]> = [];
    const fetchPage = async (from: number, to: number) => {
        ranges.push([from, to]);
        const end = Math.min(to, matching - 1);
        const data = end >= from ? Array.from({ length: end - from + 1 }, (_, i) => ({ id: from + i })) : [];
        return { data, error: null };
    };
    return { ranges, fetchPage };
}

describe('fetchAllRows', () => {
    it.each([
        [0, [[0, 999]], 0],
        [1000, [[0, 999], [1000, 1999]], 1000],
        [2905, [[0, 999], [1000, 1999], [2000, 2999]], 2905],
    ])('matching %i rows → requests %j and returns %i rows', async (matching, expectedRanges, expectedCount) => {
        const { ranges, fetchPage } = fakeSource(matching);
        const rows = await fetchAllRows<{ id: number }>('t', fetchPage);
        expect(ranges).toEqual(expectedRanges);
        expect(rows).toHaveLength(expectedCount);
        if (expectedCount > 0) {
            expect(rows[0]).toEqual({ id: 0 });
            expect(rows[expectedCount - 1]).toEqual({ id: expectedCount - 1 });
        }
    });

    describe('with concurrency 4', () => {
        const batch = (start: number) => [0, 1, 2, 3].map(i => [start + i * 1000, start + i * 1000 + 999]);

        it.each([
            [0, batch(0), 0],
            [2905, batch(0), 2905],
            [4000, [...batch(0), ...batch(4000)], 4000],
            [8808, [...batch(0), ...batch(4000), ...batch(8000)], 8808],
        ])('matching %i rows → requests %j and returns %i rows in range order', async (matching, expectedRanges, expectedCount) => {
            const { ranges, fetchPage } = fakeSource(matching);
            const rows = await fetchAllRows<{ id: number }>('t', fetchPage, { concurrency: 4 });
            expect([...ranges].sort((a, b) => a[0] - b[0])).toEqual(expectedRanges);
            expect(rows).toHaveLength(expectedCount);
            rows.forEach((r, i) => expect(r.id).toBe(i));
        });

        it('requests a whole batch before any page resolves', async () => {
            const started: number[] = [];
            const fetchPage = (from: number) => {
                started.push(from);
                return new Promise<{ data: unknown[]; error: null }>(resolve =>
                    setTimeout(() => resolve({ data: [], error: null }), 0),
                );
            };
            const pending = fetchAllRows('t', fetchPage, { concurrency: 4 });
            expect(started).toEqual([0, 1000, 2000, 3000]);
            await pending;
        });

        it('throws with label and message when the second page of a batch fails', async () => {
            const fetchPage = async (from: number) =>
                from === 1000
                    ? { data: null, error: { message: 'timeout' } }
                    : { data: Array.from({ length: 1000 }, (_, i) => ({ id: from + i })), error: null };
            await expect(fetchAllRows('etf_weight_history', fetchPage, { concurrency: 4 })).rejects.toThrow(
                /etf_weight_history.*timeout/,
            );
        });

        it.each([0, -2])('treats concurrency %i as 1', async concurrency => {
            const { ranges, fetchPage } = fakeSource(1000);
            await fetchAllRows('t', fetchPage, { concurrency });
            expect(ranges).toEqual([[0, 999], [1000, 1999]]);
        });
    });

    it('treats null data as an empty final page', async () => {
        const rows = await fetchAllRows('t', async () => ({ data: null, error: null }));
        expect(rows).toEqual([]);
    });

    it('throws with label and message when the second page fails, without partial results', async () => {
        let call = 0;
        const fetchPage = async () => {
            call += 1;
            if (call === 1) return { data: Array.from({ length: 1000 }, (_, i) => ({ id: i })), error: null };
            return { data: null, error: { message: 'timeout' } };
        };
        await expect(fetchAllRows('etf_weight_history', fetchPage)).rejects.toThrow(
            /etf_weight_history.*timeout/,
        );
    });
});
