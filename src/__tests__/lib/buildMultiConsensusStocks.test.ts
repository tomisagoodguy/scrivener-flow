import { buildConsensusHref, buildMultiConsensusStocks, parseConsensusParams } from '@/lib/investment/strategyConsensusUtils';
import type { ConsensusParams } from '@/lib/investment/strategyConsensusUtils';
import type { StrategySignalsResult } from '@/lib/investment/strategyUtils';

describe('buildMultiConsensusStocks', () => {
    it('sorts by count desc then stock_id asc — spec example', () => {
        // From spec: 3055(3 strategies) → 1st, 2464(2) → 2nd, 4127(2) → 3rd
        const result: StrategySignalsResult = {
            date: '2025-01-01',
            strategies: [
                {
                    id: 'capital_layer',
                    description: 'Capital Layer',
                    date: '2025-01-01',
                    stocks: [
                        { stock_id: '3055', score: 1, movement: 'adding', name: '股票A', industry: '半導體', etfHolders: ['00981A'], avg_turnover: null, liquidity_flag: null },
                        { stock_id: '2464', score: 1, movement: 'holding', name: '股票B', industry: '電子', etfHolders: [], avg_turnover: null, liquidity_flag: null },
                    ],
                },
                {
                    id: 'low_vol_alpha',
                    description: 'Low Vol Alpha',
                    date: '2025-01-01',
                    stocks: [
                        { stock_id: '3055', score: 1, movement: 'adding', name: '股票A', industry: '半導體', etfHolders: ['00981A'], avg_turnover: null, liquidity_flag: null },
                        { stock_id: '4127', score: 1, movement: 'none', name: '股票C', industry: '生技', etfHolders: [], avg_turnover: null, liquidity_flag: null },
                    ],
                },
                {
                    id: 'trend_template',
                    description: 'Trend',
                    date: '2025-01-01',
                    stocks: [
                        { stock_id: '3055', score: 1, movement: 'adding', name: '股票A', industry: '半導體', etfHolders: ['00981A'], avg_turnover: null, liquidity_flag: null },
                        { stock_id: '2464', score: 1, movement: 'holding', name: '股票B', industry: '電子', etfHolders: [], avg_turnover: null, liquidity_flag: null },
                        { stock_id: '4127', score: 1, movement: 'none', name: '股票C', industry: '生技', etfHolders: [], avg_turnover: null, liquidity_flag: null },
                    ],
                },
            ],
        };

        const entries = buildMultiConsensusStocks(result);

        expect(entries).toHaveLength(3);
        expect(entries[0]).toMatchObject({ stock_id: '3055', count: 3 });
        expect(entries[1]).toMatchObject({ stock_id: '2464', count: 2 });
        expect(entries[2]).toMatchObject({ stock_id: '4127', count: 2 });
    });

    it('chart slide order — strategy-consensus-chart-view spec Example: (2454,2)(2330,3)(3017,2) → 2330, 2454, 3017', () => {
        const stock = (stock_id: string) => ({
            stock_id, score: 1, movement: 'none' as const, name: stock_id, industry: null, etfHolders: [], avg_turnover: null, liquidity_flag: null,
        });
        const result: StrategySignalsResult = {
            date: '2026-10-30',
            strategies: [
                { id: 'a', description: 'A', date: '2026-10-30', stocks: [stock('3017'), stock('2454'), stock('2330')] },
                { id: 'b', description: 'B', date: '2026-10-30', stocks: [stock('2454'), stock('2330'), stock('3017')] },
                { id: 'c', description: 'C', date: '2026-10-30', stocks: [stock('2330')] },
            ],
        };

        expect(buildMultiConsensusStocks(result).map((e) => [e.stock_id, e.count])).toEqual([
            ['2330', 3],
            ['2454', 2],
            ['3017', 2],
        ]);
    });

    it('filters out stocks appearing in only one strategy', () => {
        const result: StrategySignalsResult = {
            date: '2025-01-01',
            strategies: [
                { id: 'a', description: '', date: '2025-01-01', stocks: [{ stock_id: '1111', score: 1, movement: 'none', avg_turnover: null, liquidity_flag: null }] },
                { id: 'b', description: '', date: '2025-01-01', stocks: [{ stock_id: '2222', score: 1, movement: 'none', avg_turnover: null, liquidity_flag: null }] },
            ],
        };
        expect(buildMultiConsensusStocks(result)).toHaveLength(0);
    });

    it('returns empty array when result is null', () => {
        expect(buildMultiConsensusStocks(null)).toHaveLength(0);
    });

    it('uses data from first occurrence for name/industry/etfHolders', () => {
        const result: StrategySignalsResult = {
            date: '2025-01-01',
            strategies: [
                {
                    id: 'a',
                    description: '',
                    date: '2025-01-01',
                    stocks: [{ stock_id: '3055', score: 1, movement: 'adding', name: 'FirstName', industry: 'FirstIndustry', etfHolders: ['00981A'], avg_turnover: null, liquidity_flag: null }],
                },
                {
                    id: 'b',
                    description: '',
                    date: '2025-01-01',
                    stocks: [{ stock_id: '3055', score: 1, movement: 'adding', name: 'SecondName', industry: 'SecondIndustry', etfHolders: ['00980A'], avg_turnover: null, liquidity_flag: null }],
                },
            ],
        };
        const entries = buildMultiConsensusStocks(result);
        expect(entries[0]).toMatchObject({ stock_id: '3055', name: 'FirstName', industry: 'FirstIndustry' });
    });
});

function stock(stock_id: string) {
    return { stock_id, score: 1, movement: 'none' as const, avg_turnover: null, liquidity_flag: null };
}

describe('buildMultiConsensusStocks threshold & strategies', () => {
    const result: StrategySignalsResult = {
        date: '2025-01-01',
        strategies: [
            { id: 'capital_layer', description: '', date: '2025-01-01', stocks: [stock('3055'), stock('2464'), stock('3055')] },
            { id: 'low_vol_alpha', description: '', date: '2025-01-01', stocks: [stock('3055')] },
            { id: 'trend_template', description: '', date: '2025-01-01', stocks: [stock('3055'), stock('2464')] },
        ],
    };

    it('threshold 3 excludes count-2 stocks', () => {
        const entries = buildMultiConsensusStocks(result, 3);
        expect(entries.map((e) => e.stock_id)).toEqual(['3055']);
    });

    it('counts the same strategy only once even if it lists a stock twice', () => {
        const entries = buildMultiConsensusStocks(result);
        expect(entries.find((e) => e.stock_id === '3055')!.count).toBe(3);
    });

    it('returns strategy ids with registry labels (fallback to id)', () => {
        const withUnknown: StrategySignalsResult = {
            ...result,
            strategies: [
                ...result.strategies,
                { id: 'unknown_x', description: '', date: '2025-01-01', stocks: [stock('2464')] },
            ],
        };
        const entry = buildMultiConsensusStocks(withUnknown).find((e) => e.stock_id === '2464')!;
        expect(entry.strategies).toEqual([
            { id: 'capital_layer', label: 'Capital Layer 多層籌碼選股' },
            { id: 'trend_template', label: '趨勢樣板選股' },
            { id: 'unknown_x', label: 'unknown_x' },
        ]);
    });
});

describe('parseConsensusParams', () => {
    it('returns defaults when params are missing', () => {
        expect(parseConsensusParams({})).toEqual({ minCount: 2, view: 'list', window: 'latest' });
    });

    it('accepts valid values', () => {
        expect(parseConsensusParams({ cmin: '4', cview: 'matrix', cwin: '14' }))
            .toEqual({ minCount: 4, view: 'matrix', window: 14 });
    });

    it('accepts cview=chart', () => {
        expect(parseConsensusParams({ cmin: '3', cview: 'chart', cwin: '14' }))
            .toEqual({ minCount: 3, view: 'chart', window: 14 });
    });

    it.each([
        [{ cmin: '9' }, { minCount: 2, view: 'list', window: 'latest' }],
        [{ cview: 'foo' }, { minCount: 2, view: 'list', window: 'latest' }],
        [{ cview: 'grid' }, { minCount: 2, view: 'list', window: 'latest' }],
        [{ cwin: '5' }, { minCount: 2, view: 'list', window: 'latest' }],
        [{ cmin: '3.0', cwin: '7x' }, { minCount: 2, view: 'list', window: 'latest' }],
    ])('falls back to defaults for invalid %o', (input, expected) => {
        expect(parseConsensusParams(input)).toEqual(expected);
    });
});

describe('buildConsensusHref', () => {
    it.each<[ConsensusParams, string]>([
        [{ minCount: 2, view: 'list', window: 'latest' }, '/investment/strategy'],
        [{ minCount: 3, view: 'chart', window: 14 }, '/investment/strategy?cmin=3&cview=chart&cwin=14'],
        [{ minCount: 3, view: 'list', window: 7 }, '/investment/strategy?cmin=3&cwin=7'],
        [{ minCount: 2, view: 'matrix', window: 'latest' }, '/investment/strategy?cview=matrix'],
    ])('%o → %s', (params, expected) => {
        expect(buildConsensusHref(params)).toBe(expected);
    });
});
