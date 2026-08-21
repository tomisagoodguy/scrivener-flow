/**
 * Tests for the per-stock overlap aggregation used by the "table view"
 * (EtfOverlapStockTable). Covers the etf-overlap-stock-table spec's
 * "Per-stock overlap row computation" and "Table view sorting" requirements.
 */

import { buildStockOverlapRows, sortStockOverlapRows } from '@/components/features/investment/EtfComparePanelUtils';
import type { EtfData } from '@/components/features/investment/EtfComparePanel';

function makeEtf(etf_code: string, holdings: { stock_code: string; stock_name: string; weight: number }[]): EtfData {
    return {
        etf_code,
        name: `ETF ${etf_code}`,
        manager: '測試投信',
        color: '#888888',
        data_date: '2026-08-21',
        holdings: holdings.map((h, idx) => ({ ...h, rank: idx + 1, in_etfs: [etf_code] })),
        aum_100m_twd: null,
        sectors: [],
    };
}

describe('buildStockOverlapRows', () => {
    it('matches the spec example: A/B/C hold the same stock at 2.0/3.0/4.0%, totalEtfs=5', () => {
        // GIVEN A(2.0), B(3.0), C(4.0) all hold stock 1101, totalEtfs=5
        const etfs = [
            makeEtf('A', [{ stock_code: '1101', stock_name: '台泥', weight: 2.0 }]),
            makeEtf('B', [{ stock_code: '1101', stock_name: '台泥', weight: 3.0 }]),
            makeEtf('C', [{ stock_code: '1101', stock_name: '台泥', weight: 4.0 }]),
        ];

        const rows = buildStockOverlapRows(etfs, 5);
        const row = rows.find(r => r.stock_code === '1101')!;

        expect(row.held_count).toBe(3);
        expect(row.coverage_pct).toBe(60);
        expect(row.avg_weight).toBeCloseTo(3.0);
        expect(row.total_weight).toBeCloseTo(9.0);
        expect(row.held_by).toEqual(['A', 'B', 'C']);
    });

    it('matches the spec example: stock held by a single ETF at 1.5%, totalEtfs=5', () => {
        // GIVEN A(1.5) holds stock 2330 alone
        const etfs = [makeEtf('A', [{ stock_code: '2330', stock_name: '台積電', weight: 1.5 }])];

        const rows = buildStockOverlapRows(etfs, 5);
        const row = rows.find(r => r.stock_code === '2330')!;

        expect(row.held_count).toBe(1);
        expect(row.coverage_pct).toBe(20);
        expect(row.avg_weight).toBeCloseTo(1.5);
        expect(row.total_weight).toBeCloseTo(1.5);
    });

    it('guards against division by zero when totalEtfs is 0', () => {
        // GIVEN totalEtfs=0 (no ETF has data for the current snapshot)
        const etfs: EtfData[] = [];

        const rows = buildStockOverlapRows(etfs, 0);

        expect(rows).toEqual([]);
    });

    it('includes stocks held by only one ETF, not only overlap.byCount (n>=2) stocks', () => {
        const etfs = [
            makeEtf('A', [
                { stock_code: '1101', stock_name: '台泥', weight: 2.0 },
                { stock_code: '2330', stock_name: '台積電', weight: 5.0 },
            ]),
            makeEtf('B', [{ stock_code: '1101', stock_name: '台泥', weight: 3.0 }]),
        ];

        const rows = buildStockOverlapRows(etfs, 2);
        const soloRow = rows.find(r => r.stock_code === '2330')!;

        expect(soloRow.held_count).toBe(1);
        expect(rows.map(r => r.stock_code).sort()).toEqual(['1101', '2330']);
    });
});

describe('sortStockOverlapRows', () => {
    const rows = buildStockOverlapRows([
        makeEtf('A', [
            { stock_code: '1101', stock_name: '台泥', weight: 2.0 },
            { stock_code: '2330', stock_name: '台積電', weight: 5.0 },
            { stock_code: '2454', stock_name: '聯發科', weight: 1.0 },
        ]),
        makeEtf('B', [
            { stock_code: '1101', stock_name: '台泥', weight: 3.0 },
            { stock_code: '2454', stock_name: '聯發科', weight: 1.0 },
        ]),
    ], 2);

    it('sorts by held_count descending (default table view order)', () => {
        const sorted = sortStockOverlapRows(rows, 'held_count', 'desc');
        expect(sorted.map(r => r.stock_code)).toEqual(
            expect.arrayContaining(['1101', '2454'])
        );
        expect(sorted[0].held_count).toBeGreaterThanOrEqual(sorted[sorted.length - 1].held_count);
        expect(sorted.map(r => r.stock_code).indexOf('2330')).toBe(sorted.length - 1);
    });

    it('reverses direction when toggled from desc to asc', () => {
        const desc = sortStockOverlapRows(rows, 'held_count', 'desc');
        const asc = sortStockOverlapRows(rows, 'held_count', 'asc');
        expect(asc.map(r => r.stock_code)).toEqual([...desc.map(r => r.stock_code)].reverse());
    });

    it('does not mutate the input array', () => {
        const original = [...rows];
        sortStockOverlapRows(rows, 'total_weight', 'asc');
        expect(rows).toEqual(original);
    });

    it('sorts by total_weight', () => {
        const sorted = sortStockOverlapRows(rows, 'total_weight', 'desc');
        // 1101: 2.0+3.0=5.0, 2330: 5.0, 2454: 1.0+1.0=2.0
        expect(sorted[sorted.length - 1].stock_code).toBe('2454');
    });
});
