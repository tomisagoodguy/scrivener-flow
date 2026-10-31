/**
 * Tests for equity ranking chart view helpers (change: equity-ranking-chart-view, task 2.1;
 * list limit 100 from change: equity-chart-top-100, task 1.1).
 * Covers the "rows selected per list" and "header context formatting" example tables.
 */

import type { EquityRow, RankingData, Tier } from '@/lib/investment/equityPageData';
import {
    EQUITY_CHART_LIST_LIMIT,
    equityBaseParams,
    equityHref,
    formatEquityHeader,
    parseEquityChartList,
    selectEquityChartRows,
} from '@/lib/investment/equityChartUtils';

function row(code: string, overrides: Partial<EquityRow> = {}): EquityRow {
    return {
        stock_code: code,
        stock_name: null,
        total_shareholders: null,
        shareholders_change_rate: null,
        big_holder_pct_change: null,
        mid_holder_pct_change: null,
        whale_holder_pct_change: null,
        ...overrides,
    };
}

function rows(prefix: string, n: number): EquityRow[] {
    return Array.from({ length: n }, (_, i) => row(`${prefix}${i + 1}`));
}

function rankingData(double: number, big: number, retail: number): RankingData {
    return {
        snapshotDate: '2026-10-22',
        doubleSignalRanking: rows('D', double),
        bigHolderRanking: rows('B', big),
        retailDeclineRanking: rows('R', retail),
        priceIndicators: {},
        etfMap: {},
        flowMap: {},
        weeks: 1,
        dateRange: { from: '10/15', to: '10/22' },
    };
}

describe('parseEquityChartList', () => {
    it.each([
        [undefined, 'double'],
        ['foo', 'double'],
        ['double', 'double'],
        ['big', 'big'],
        ['retail', 'retail'],
    ] as const)('parses %p as %p', (raw, expected) => {
        expect(parseEquityChartList(raw)).toBe(expected);
    });
});

describe('selectEquityChartRows', () => {
    it('limit is 100 (must equal Python EQUITY_LIST_LIMIT)', () => {
        expect(EQUITY_CHART_LIST_LIMIT).toBe(100);
    });

    it('double: returns the double-signal rows as is', () => {
        const data = rankingData(7, 218, 272);
        expect(selectEquityChartRows(data, 'double')).toEqual(data.doubleSignalRanking);
    });

    it('big: returns big-holder rows 1–100 in order', () => {
        const data = rankingData(7, 218, 272);
        const result = selectEquityChartRows(data, 'big');
        expect(result).toEqual(data.bigHolderRanking.slice(0, 100));
        expect(result.map((r) => r.stock_code).at(0)).toBe('B1');
        expect(result.map((r) => r.stock_code).at(-1)).toBe('B100');
    });

    it('retail: returns retail rows 1–100 in order', () => {
        const data = rankingData(7, 218, 272);
        const result = selectEquityChartRows(data, 'retail');
        expect(result).toEqual(data.retailDeclineRanking.slice(0, 100));
        expect(result.map((r) => r.stock_code).at(0)).toBe('R1');
        expect(result.map((r) => r.stock_code).at(-1)).toBe('R100');
    });

    it('retail: returns all rows when fewer than 100', () => {
        const data = rankingData(7, 218, 12);
        expect(selectEquityChartRows(data, 'retail')).toEqual(data.retailDeclineRanking);
    });
});

describe('equityBaseParams / equityHref', () => {
    it('keeps only non-default params', () => {
        expect(equityBaseParams(null, 1, null, 'desc')).toEqual({});
        expect(equityBaseParams('200', 2, 'amount', 'asc')).toEqual({ tier: '200', weeks: '2', sort: 'amount', dir: 'asc' });
    });

    it('builds back link to the table view', () => {
        expect(equityHref({})).toBe('/investment/equity');
        expect(equityHref(equityBaseParams('200', 1, null, 'desc'))).toBe('/investment/equity?tier=200');
    });
});

describe('formatEquityHeader', () => {
    const base = { big_holder_pct_change: 0.85, mid_holder_pct_change: 0.1, whale_holder_pct_change: 1.2 };

    it.each<[string, Tier | null, Partial<EquityRow>, string]>([
        ['default tier', null, { ...base, shareholders_change_rate: -2.3 }, '400張+大戶 +0.85pp・股東 -2.30%'],
        ['tier 200 uses mid', '200', { ...base, shareholders_change_rate: -2.3 }, '200張+大戶 +0.10pp・股東 -2.30%'],
        ['tier 1000 uses whale, null rate omitted', '1000', { ...base, shareholders_change_rate: null }, '1000張+大戶 +1.20pp'],
        [
            'tier 400 null big omitted',
            '400',
            { big_holder_pct_change: null, mid_holder_pct_change: 0.1, whale_holder_pct_change: 1.2, shareholders_change_rate: 1.5 },
            '股東 +1.50%',
        ],
        ['all null', null, {}, ''],
    ])('%s', (_label, tier, overrides, expected) => {
        expect(formatEquityHeader(row('2330', overrides), tier)).toBe(expected);
    });
});
