/**
 * Tests for getStrategySnapshots server action.
 *
 * Regression coverage for the statement-timeout fix (Postgres error 57014):
 * the old implementation did `.in(stockIds).order('date', desc)` with no
 * limit, forcing Postgres to sort every matched row across all requested
 * stocks. The fix queries per stock_id with `.limit(1)` so it can use the
 * existing (stock_id, date DESC) index instead of sorting the full result set.
 */

const mockFrom = jest.fn();
jest.mock('@/lib/supabase/server', () => ({
    createClient: () => Promise.resolve({ from: mockFrom }),
}));

import { getStrategySnapshots } from '../getStrategySnapshots';

interface SnapshotRow {
    stock_id: string;
    date: string;
    ohlcv: unknown[];
    mas: Record<string, unknown>;
    signals: unknown[];
    margin: unknown[];
    revenue: unknown[];
    inv_chips: unknown[];
    summary: Record<string, unknown>;
}

function makeRow(stock_id: string, date: string): SnapshotRow {
    return { stock_id, date, ohlcv: [], mas: {}, signals: [], margin: [], revenue: [], inv_chips: [], summary: {} };
}

/** 逐股 builder：只認得 .eq('stock_id', id) + .order + .limit(1) + .maybeSingle()，
 *  完全沒有 .in()，藉此證明修法後不再對整批 stockIds 做單一大排序查詢。 */
function wirePerStockBuilder(byStockId: Map<string, SnapshotRow[]>, errorForId?: string) {
    mockFrom.mockImplementation((table: string) => {
        expect(table).toBe('bare_k_snapshots');
        let eqId: string | undefined;
        const builder: Record<string, jest.Mock> = {
            select: jest.fn(() => builder),
            eq: jest.fn((col: string, val: string) => {
                expect(col).toBe('stock_id');
                eqId = val;
                return builder;
            }),
            order: jest.fn((col: string, opts: { ascending: boolean }) => {
                expect(col).toBe('date');
                expect(opts).toEqual({ ascending: false });
                return builder;
            }),
            limit: jest.fn((n: number) => {
                expect(n).toBe(1);
                return builder;
            }),
            maybeSingle: jest.fn(() => {
                if (eqId === errorForId) {
                    return Promise.resolve({ data: null, error: { message: 'boom' } });
                }
                const rows = byStockId.get(eqId!) ?? [];
                const latest = [...rows].sort((a, b) => (a.date < b.date ? 1 : -1))[0] ?? null;
                return Promise.resolve({ data: latest, error: null });
            }),
            in: jest.fn(() => {
                throw new Error('getStrategySnapshots must not call .in() — that reintroduces the statement timeout bug');
            }),
        };
        return builder;
    });
}

describe('getStrategySnapshots', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns an empty map without querying when stockIds is empty', async () => {
        wirePerStockBuilder(new Map());

        const result = await getStrategySnapshots([]);

        expect(result.size).toBe(0);
        expect(mockFrom).not.toHaveBeenCalled();
    });

    it('queries per stock_id with limit(1) instead of .in() + unbounded order (regression for 57014)', async () => {
        const byStockId = new Map<string, SnapshotRow[]>([
            ['2330', [makeRow('2330', '2026-06-30'), makeRow('2330', '2026-06-29')]],
            ['2454', [makeRow('2454', '2026-06-28')]],
        ]);
        wirePerStockBuilder(byStockId);

        const result = await getStrategySnapshots(['2330', '2454']);

        expect(mockFrom).toHaveBeenCalledTimes(2);
        expect(result.get('2330')?.date).toBe('2026-06-30');
        expect(result.get('2454')?.date).toBe('2026-06-28');
    });

    it('sets null for stock_ids with no snapshot row', async () => {
        wirePerStockBuilder(new Map([['2330', [makeRow('2330', '2026-06-30')]]]));

        const result = await getStrategySnapshots(['2330', '9999']);

        expect(result.get('2330')?.date).toBe('2026-06-30');
        expect(result.get('9999')).toBeNull();
    });

    it('logs the error and keeps other stocks unaffected when one per-stock query fails', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        wirePerStockBuilder(
            new Map([['2330', [makeRow('2330', '2026-06-30')]], ['2454', [makeRow('2454', '2026-06-28')]]]),
            '2454'
        );

        const result = await getStrategySnapshots(['2330', '2454']);

        expect(result.get('2330')?.date).toBe('2026-06-30');
        expect(result.get('2454')).toBeNull();
        expect(consoleSpy).toHaveBeenCalledWith('[getStrategySnapshots]', { message: 'boom' });
        consoleSpy.mockRestore();
    });
});
