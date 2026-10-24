import { buildConsensusHistory } from '@/lib/investment/strategyConsensusUtils';

describe('buildConsensusHistory', () => {
    // spec 範例：window aggregation
    const rows = [
        { strategy_id: 'fund_momentum', stock_id: '2330', date: '2026-10-20' },
        { strategy_id: 'fund_momentum', stock_id: '2330', date: '2026-10-21' },
        { strategy_id: 'capital_layer', stock_id: '2330', date: '2026-10-17' },
        { strategy_id: 'trend_template', stock_id: '3055', date: '2026-10-22' },
    ];
    const stockInfo = [
        { stock_code: '2330', name_short: '台積電', industry: '半導體業' },
    ];

    it('counts distinct strategies and records last selected date', () => {
        const entries = buildConsensusHistory(rows, stockInfo, 2);
        expect(entries).toHaveLength(1);
        expect(entries[0]).toMatchObject({
            stock_id: '2330',
            name: '台積電',
            industry: '半導體業',
            count: 2,
            lastDate: '2026-10-21',
        });
        expect(entries[0].strategies.map((s) => s.id)).toEqual(['capital_layer', 'fund_momentum']);
    });

    it('omits movement and etfHolders in history entries', () => {
        const [entry] = buildConsensusHistory(rows, stockInfo, 2);
        expect(entry.movement).toBeUndefined();
        expect(entry.etfHolders).toBeUndefined();
    });

    it('applies threshold and sorts by count desc then stock_id asc', () => {
        const entries = buildConsensusHistory(rows, stockInfo, 1);
        expect(entries.map((e) => [e.stock_id, e.count])).toEqual([['2330', 2], ['3055', 1]]);
        expect(entries[1]).toMatchObject({ name: null, industry: null, lastDate: '2026-10-22' });
    });

    it('returns empty list for empty rows', () => {
        expect(buildConsensusHistory([], [], 2)).toEqual([]);
    });
});
