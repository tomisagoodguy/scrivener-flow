import { buildMultiConsensusStocks } from '@/lib/investment/strategyConsensusUtils';
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
                    stocks: [
                        { stock_id: '3055', score: 1, movement: 'adding', name: '股票A', industry: '半導體', etfHolders: ['00981A'], avg_turnover: null, liquidity_flag: null },
                        { stock_id: '2464', score: 1, movement: 'holding', name: '股票B', industry: '電子', etfHolders: [], avg_turnover: null, liquidity_flag: null },
                    ],
                },
                {
                    id: 'low_vol_alpha',
                    description: 'Low Vol Alpha',
                    stocks: [
                        { stock_id: '3055', score: 1, movement: 'adding', name: '股票A', industry: '半導體', etfHolders: ['00981A'], avg_turnover: null, liquidity_flag: null },
                        { stock_id: '4127', score: 1, movement: 'none', name: '股票C', industry: '生技', etfHolders: [], avg_turnover: null, liquidity_flag: null },
                    ],
                },
                {
                    id: 'trend_template',
                    description: 'Trend',
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

    it('filters out stocks appearing in only one strategy', () => {
        const result: StrategySignalsResult = {
            date: '2025-01-01',
            strategies: [
                { id: 'a', description: '', stocks: [{ stock_id: '1111', score: 1, movement: 'none', avg_turnover: null, liquidity_flag: null }] },
                { id: 'b', description: '', stocks: [{ stock_id: '2222', score: 1, movement: 'none', avg_turnover: null, liquidity_flag: null }] },
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
                    stocks: [{ stock_id: '3055', score: 1, movement: 'adding', name: 'FirstName', industry: 'FirstIndustry', etfHolders: ['00981A'], avg_turnover: null, liquidity_flag: null }],
                },
                {
                    id: 'b',
                    description: '',
                    stocks: [{ stock_id: '3055', score: 1, movement: 'adding', name: 'SecondName', industry: 'SecondIndustry', etfHolders: ['00980A'], avg_turnover: null, liquidity_flag: null }],
                },
            ],
        };
        const entries = buildMultiConsensusStocks(result);
        expect(entries[0]).toMatchObject({ stock_id: '3055', name: 'FirstName', industry: 'FirstIndustry' });
    });
});
