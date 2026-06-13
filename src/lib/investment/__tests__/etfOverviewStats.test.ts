/**
 * Tests for etfOverviewStats aggregation.
 *
 * TDD: Written BEFORE implementation. Covers the three spec scenarios of
 * "ETF overview stats aggregation":
 *   1. diff count mapping (IN/OUT/BUY/SELL → added/removed/increased/decreased)
 *   2. missing NAV/AUM data → null fields, rest populated
 *   3. per-ETF disclosure date independence
 */

import { buildOverviewStats } from '@/lib/investment/etfOverviewStats';
import type { EtfRegistryEntry } from '@/lib/investment/etfRegistry';

const registry: EtfRegistryEntry[] = [
    { code: '00981A', shortCode: '00981', name: '主動統一台股增長', manager: '統一投信', issuer: '統一', color: '#8b5cf6', dataSource: 'official_api', isPrimary: true },
    { code: '00982A', shortCode: '00982', name: '主動群益台灣強棒', manager: '群益投信', issuer: '群益', color: '#10b981', dataSource: 'official_api' },
];

describe('buildOverviewStats', () => {
    it('maps diff change_type rows to added/removed/increased/decreased counts', () => {
        // Example: IN, IN, BUY, SELL, SELL, OUT → added=2, removed=1, increased=1, decreased=2
        const dailyRows = [{ etf_code: '00981A', data_date: '2026-06-12', holdings_count: 2 }];
        const diffRows = [
            { etf_code: '00981A', data_date: '2026-06-12', change_type: 'IN' },
            { etf_code: '00981A', data_date: '2026-06-12', change_type: 'IN' },
            { etf_code: '00981A', data_date: '2026-06-12', change_type: 'BUY' },
            { etf_code: '00981A', data_date: '2026-06-12', change_type: 'SELL' },
            { etf_code: '00981A', data_date: '2026-06-12', change_type: 'SELL' },
            { etf_code: '00981A', data_date: '2026-06-12', change_type: 'OUT' },
        ];

        const stats = buildOverviewStats(registry, dailyRows, [], diffRows);
        const stat = stats.find(s => s.code === '00981A');

        expect(stat).toBeDefined();
        expect(stat!.added).toBe(2);
        expect(stat!.removed).toBe(1);
        expect(stat!.increased).toBe(1);
        expect(stat!.decreased).toBe(2);
    });

    it('returns all four diff counts as 0 when no diff rows exist on the disclosure date', () => {
        const dailyRows = [{ etf_code: '00981A', data_date: '2026-06-12', holdings_count: 1 }];

        const stats = buildOverviewStats(registry, dailyRows, [], []);
        const stat = stats.find(s => s.code === '00981A');

        expect(stat!.added).toBe(0);
        expect(stat!.removed).toBe(0);
        expect(stat!.increased).toBe(0);
        expect(stat!.decreased).toBe(0);
    });

    it('returns null nav/aum100m when etf_aum_series has no rows, with remaining fields populated', () => {
        const dailyRows = [{ etf_code: '00981A', data_date: '2026-06-12', holdings_count: 3 }];

        const stats = buildOverviewStats(registry, dailyRows, [], []);
        const stat = stats.find(s => s.code === '00981A');

        expect(stat!.nav).toBeNull();
        expect(stat!.aum100m).toBeNull();
        expect(stat!.dataDate).toBe('2026-06-12');
        expect(stat!.holdingsCount).toBe(3);
        expect(stat!.name).toBe('主動統一台股增長');
        expect(stat!.manager).toBe('統一投信');
    });

    it('uses the latest aum row per ETF for nav/aum100m', () => {
        const dailyRows = [{ etf_code: '00981A', data_date: '2026-06-12', holdings_count: 1 }];
        const aumRows = [
            { etf_code: '00981A', data_date: '2026-06-11', nav: 30.10, aum_100m: 2800.5 },
            { etf_code: '00981A', data_date: '2026-06-12', nav: 30.41, aum_100m: 2834.32 },
        ];

        const stats = buildOverviewStats(registry, dailyRows, aumRows, []);
        const stat = stats.find(s => s.code === '00981A');

        expect(stat!.nav).toBe(30.41);
        expect(stat!.aum100m).toBe(2834.32);
    });

    it('computes each ETF against its own latest disclosure date (per-ETF independence)', () => {
        // ETF A latest = 2026-06-12, ETF B latest = 2026-06-05.
        const dailyRows = [
            { etf_code: '00981A', data_date: '2026-06-12', holdings_count: 2 },
            { etf_code: '00982A', data_date: '2026-06-05', holdings_count: 1 },
        ];
        const diffRows = [
            // counted: matches each ETF's own date
            { etf_code: '00981A', data_date: '2026-06-12', change_type: 'BUY' },
            { etf_code: '00982A', data_date: '2026-06-05', change_type: 'IN' },
            // not counted: wrong dates
            { etf_code: '00981A', data_date: '2026-06-11', change_type: 'SELL' },
            { etf_code: '00982A', data_date: '2026-06-12', change_type: 'OUT' },
        ];

        const stats = buildOverviewStats(registry, dailyRows, [], diffRows);
        const a = stats.find(s => s.code === '00981A')!;
        const b = stats.find(s => s.code === '00982A')!;

        expect(a.dataDate).toBe('2026-06-12');
        expect(a.holdingsCount).toBe(2);
        expect(a.increased).toBe(1);
        expect(a.decreased).toBe(0);

        expect(b.dataDate).toBe('2026-06-05');
        expect(b.holdingsCount).toBe(1);
        expect(b.added).toBe(1);
        expect(b.removed).toBe(0);
    });

    it('still returns an entry with null dataDate and zero counts for an ETF without any snapshot data', () => {
        const stats = buildOverviewStats(registry, [], [], []);
        const stat = stats.find(s => s.code === '00982A');

        expect(stat).toBeDefined();
        expect(stat!.dataDate).toBeNull();
        expect(stat!.holdingsCount).toBe(0);
        expect(stat!.added).toBe(0);
    });
});
