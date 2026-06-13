/**
 * Tests for ETF overview card ordering.
 *
 * TDD: Written BEFORE implementation. Covers the "Card ordering" spec:
 *   - disclosure date equal to global max comes first
 *   - within each freshness group, AUM descending
 *   - null AUM sorts last within the same group
 */

import { sortOverviewStats } from '@/components/features/investment/EtfOverviewGrid';
import type { EtfOverviewStat } from '@/lib/investment/etfOverviewStats';

function makeStat(code: string, dataDate: string | null, aum100m: number | null): EtfOverviewStat {
    return {
        code,
        shortCode: code.slice(0, 5),
        name: `ETF ${code}`,
        manager: '測試投信',
        color: '#888888',
        dataDate,
        holdingsCount: 10,
        nav: null,
        aum100m,
        added: 0,
        removed: 0,
        increased: 0,
        decreased: 0,
    };
}

describe('sortOverviewStats', () => {
    it('orders by spec example: C, A, D, B', () => {
        // GIVEN A(date=2026-06-12, aum=175), B(date=2026-06-05, aum=2834),
        //       C(date=2026-06-12, aum=498), D(date=2026-06-12, aum=null)
        const stats = [
            makeStat('A', '2026-06-12', 175),
            makeStat('B', '2026-06-05', 2834),
            makeStat('C', '2026-06-12', 498),
            makeStat('D', '2026-06-12', null),
        ];

        const sorted = sortOverviewStats(stats);

        expect(sorted.map(s => s.code)).toEqual(['C', 'A', 'D', 'B']);
    });

    it('places every fresh ETF before any stale ETF regardless of AUM', () => {
        const stats = [
            makeStat('STALE_BIG', '2026-06-05', 9999),
            makeStat('FRESH_SMALL', '2026-06-12', 1),
        ];

        const sorted = sortOverviewStats(stats);

        expect(sorted.map(s => s.code)).toEqual(['FRESH_SMALL', 'STALE_BIG']);
    });

    it('sorts null AUM after known AUM within the stale group too', () => {
        const stats = [
            makeStat('S_NULL', '2026-06-05', null),
            makeStat('S_KNOWN', '2026-06-05', 10),
            makeStat('F', '2026-06-12', 5),
        ];

        const sorted = sortOverviewStats(stats);

        expect(sorted.map(s => s.code)).toEqual(['F', 'S_KNOWN', 'S_NULL']);
    });

    it('treats null dataDate as stale and does not mutate the input array', () => {
        const stats = [
            makeStat('NO_DATE', null, 500),
            makeStat('F', '2026-06-12', 5),
        ];
        const original = [...stats];

        const sorted = sortOverviewStats(stats);

        expect(sorted.map(s => s.code)).toEqual(['F', 'NO_DATE']);
        expect(stats).toEqual(original);
    });
});
