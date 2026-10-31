/**
 * Tests for strategy chart view filters (change: fan-breakout-chart-crossref, task 2.2).
 * Covers the "combined filters" example table and "Strategy option counts" scenario.
 */

import type { FanBreakoutSignalType } from '@/lib/investment/fanBreakout';
import {
    countStocksByStrategy,
    DEFAULT_CHART_STOCK_FILTERS,
    filterChartStocks,
    parseStrategyView,
    resolveStrategyTitleDate,
    type ChartStockFilters,
    type StrategyView,
} from '@/lib/investment/strategyUtils';

// change: strategy-trades-view-tab, spec「View parsing」
describe('parseStrategyView', () => {
    it.each<[string | undefined, StrategyView]>([
        [undefined, 'strategy'],
        ['monitor', 'monitor'],
        ['chart', 'chart'],
        ['trades', 'trades'],
        ['foo', 'strategy'],
    ])('view=%s → %s', (view, expected) => {
        expect(parseStrategyView(view)).toBe(expected);
    });
});

// spec「No strategy signals in trades view」
describe('resolveStrategyTitleDate', () => {
    it('trades view falls back to trade performance asOf when no signals', () => {
        expect(resolveStrategyTitleDate('trades', null, '2026-10-30', '2026-10-29')).toBe('2026-10-30');
    });

    it('prefers the strategy signals date', () => {
        expect(resolveStrategyTitleDate('trades', '2026-10-31', '2026-10-30', null)).toBe('2026-10-31');
    });

    it('other views fall back to analytics date', () => {
        expect(resolveStrategyTitleDate('monitor', null, '2026-10-30', '2026-10-29')).toBe('2026-10-29');
    });

    it('returns — when no date is available', () => {
        expect(resolveStrategyTitleDate('trades', null, null, null)).toBe('—');
    });
});

interface ChartStock {
    stock_id: string;
    strategies: string[];
}

const stocks: ChartStock[] = [
    { stock_id: '2330', strategies: ['trend_template', 'fan_breakout'] },
    { stock_id: '2454', strategies: ['fan_breakout'] },
    { stock_id: '3017', strategies: ['trend_template'] },
];

// 3017 is deliberately absent: not a fan-breakout candidate.
const fanSignalTypes: Record<string, FanBreakoutSignalType | null> = {
    '2330': 'first',
    '2454': 'repeat',
};

const ids = (list: ChartStock[]) => list.map((s) => s.stock_id);

describe('DEFAULT_CHART_STOCK_FILTERS', () => {
    it('is all / all', () => {
        expect(DEFAULT_CHART_STOCK_FILTERS).toEqual({ strategy: 'all', fanSignal: 'all' });
    });
});

describe('filterChartStocks', () => {
    it.each<[string, ChartStockFilters, string[]]>([
        ['strategy=all, fan=all', { strategy: 'all', fanSignal: 'all' }, ['2330', '2454', '3017']],
        ['strategy=trend_template, fan=all', { strategy: 'trend_template', fanSignal: 'all' }, ['2330', '3017']],
        ['strategy=all, fan=first', { strategy: 'all', fanSignal: 'first' }, ['2330']],
        ['strategy=trend_template, fan=first', { strategy: 'trend_template', fanSignal: 'first' }, ['2330']],
    ])('%s', (_label, filters, expected) => {
        expect(ids(filterChartStocks(stocks, filters, fanSignalTypes))).toEqual(expected);
    });

    it('fan=repeat keeps only repeat candidates', () => {
        const out = filterChartStocks(stocks, { strategy: 'all', fanSignal: 'repeat' }, fanSignalTypes);
        expect(ids(out)).toEqual(['2454']);
    });

    it('excludes stocks whose signal type is null or missing from the record when fan filter is set', () => {
        const out = filterChartStocks(
            stocks,
            { strategy: 'all', fanSignal: 'first' },
            { '2330': null, '2454': 'first' },
        );
        expect(ids(out)).toEqual(['2454']);
    });

    it('returns an empty array when nothing matches', () => {
        expect(filterChartStocks(stocks, { strategy: 'low_vol_cap', fanSignal: 'all' }, fanSignalTypes)).toEqual([]);
        expect(filterChartStocks([], DEFAULT_CHART_STOCK_FILTERS, fanSignalTypes)).toEqual([]);
    });

    it('preserves input order and does not mutate the input', () => {
        const reversed = [...stocks].reverse();
        const copy = [...reversed];
        const out = filterChartStocks(reversed, DEFAULT_CHART_STOCK_FILTERS, fanSignalTypes);
        expect(ids(out)).toEqual(['3017', '2454', '2330']);
        expect(reversed).toEqual(copy);
    });
});

describe('countStocksByStrategy', () => {
    it('spec scenario: 3 stocks with trend_template and 2 with fan_breakout', () => {
        const list = [
            { strategies: ['trend_template', 'fan_breakout'] },
            { strategies: ['trend_template', 'fan_breakout'] },
            { strategies: ['trend_template'] },
        ];
        expect(countStocksByStrategy(list)).toEqual({ trend_template: 3, fan_breakout: 2 });
    });

    it('counts the 3-stock example list', () => {
        expect(countStocksByStrategy(stocks)).toEqual({ trend_template: 2, fan_breakout: 2 });
    });

    it('counts a strategy once per stock even if listed twice', () => {
        expect(countStocksByStrategy([{ strategies: ['a', 'a', 'b'] }, { strategies: ['a'] }])).toEqual({
            a: 2,
            b: 1,
        });
    });

    it('empty input -> empty record', () => {
        expect(countStocksByStrategy([])).toEqual({});
    });
});
