/**
 * strategyTradeUtils 測試（change: strategy-trade-performance, task 4.1）
 * 期望值取自 spec 的 Example 表格或手算。
 */
import {
    groupByIndustry,
    holdingDays,
    recentExits,
    splitByReturn,
    summarizeTrades,
    type StrategyTrade,
} from '@/lib/investment/strategyTradeUtils';

function trade(overrides: Partial<StrategyTrade>): StrategyTrade {
    return {
        strategyId: 'trend_template',
        stockId: '0000',
        name: null,
        industry: null,
        entrySignalDate: '2026-10-01',
        entryDate: '2026-10-02',
        entryPrice: 100,
        exitDate: null,
        exitPrice: null,
        latestDate: '2026-10-30',
        holdingReturn: null,
        postExitReturn: null,
        ...overrides,
    };
}

const AS_OF = '2026-10-30';

describe('summarizeTrades', () => {
    it('Example: 0.10, -0.05, 0.02 + 一檔待進場 → 3 檔、平均 2.33%、勝率 66.7%', () => {
        const trades = [
            trade({ stockId: 'A', holdingReturn: 0.1 }),
            trade({ stockId: 'B', holdingReturn: -0.05 }),
            trade({ stockId: 'C', holdingReturn: 0.02 }),
            trade({ stockId: 'P', entryDate: null, entryPrice: null }),
        ];
        const s = summarizeTrades(trades, AS_OF);
        expect(s.openCount).toBe(3);
        expect(s.avgReturn).toBeCloseTo(0.0233, 4);
        expect(s.winRate).toBeCloseTo(2 / 3, 6);
        expect(s.pending.map((t) => t.stockId)).toEqual(['P']);
    });

    it('Example: 無持有中 → 0 檔，平均與勝率為 null', () => {
        const s = summarizeTrades([], AS_OF);
        expect(s).toMatchObject({ openCount: 0, avgReturn: null, winRate: null, exitCount: 0, avgPostExitReturn: null });
    });

    it('持有報酬為 null 者不計入統計', () => {
        const s = summarizeTrades([trade({ holdingReturn: null }), trade({ holdingReturn: 0.04 })], AS_OF);
        expect(s.openCount).toBe(1);
        expect(s.avgReturn).toBeCloseTo(0.04, 6);
    });

    it('近 60 天換出：檔數與換出後平均報酬', () => {
        const trades = [
            trade({ stockId: 'X', exitDate: '2026-10-01', holdingReturn: 0.12, postExitReturn: 0.05 }),
            trade({ stockId: 'Y', exitDate: '2026-09-15', holdingReturn: -0.02, postExitReturn: -0.01 }),
            trade({ stockId: 'OLD', exitDate: '2026-08-01', postExitReturn: 0.5 }),
        ];
        const s = summarizeTrades(trades, AS_OF);
        expect(s.openCount).toBe(0);
        expect(s.exitCount).toBe(2);
        expect(s.avgPostExitReturn).toBeCloseTo(0.02, 6);
    });
});

describe('splitByReturn', () => {
    it('Example: A 0.08、B -0.03、C 0.15、D 0 → 正 C,A；負 B,D', () => {
        const trades = [
            trade({ stockId: 'A', holdingReturn: 0.08 }),
            trade({ stockId: 'B', holdingReturn: -0.03 }),
            trade({ stockId: 'C', holdingReturn: 0.15 }),
            trade({ stockId: 'D', holdingReturn: 0 }),
        ];
        const { positive, negative } = splitByReturn(trades);
        expect(positive.map((t) => t.stockId)).toEqual(['C', 'A']);
        expect(negative.map((t) => t.stockId)).toEqual(['B', 'D']);
    });

    it('排除已出場、待進場與 null 報酬', () => {
        const trades = [
            trade({ stockId: 'EXIT', exitDate: '2026-10-20', holdingReturn: 0.3 }),
            trade({ stockId: 'PEND', entryDate: null, holdingReturn: null }),
            trade({ stockId: 'NULL', holdingReturn: null }),
        ];
        expect(splitByReturn(trades)).toEqual({ positive: [], negative: [] });
    });
});

describe('groupByIndustry', () => {
    it('Example: 半導體 0.10、0.04；航運 -0.06 → 半導體 2 檔 7.00% 在前', () => {
        const trades = [
            trade({ stockId: '2330', industry: '半導體', holdingReturn: 0.1 }),
            trade({ stockId: '2454', industry: '半導體', holdingReturn: 0.04 }),
            trade({ stockId: '2603', industry: '航運', holdingReturn: -0.06 }),
        ];
        const groups = groupByIndustry(trades);
        expect(groups).toHaveLength(2);
        expect(groups[0]).toMatchObject({ industry: '半導體', count: 2, positive: 2, negative: 0 });
        expect(groups[0].avgReturn).toBeCloseTo(0.07, 6);
        expect(groups[1]).toMatchObject({ industry: '航運', count: 1, positive: 0, negative: 1 });
        expect(groups[1].avgReturn).toBeCloseTo(-0.06, 6);
    });

    it('無產業歸「未分類」，報酬 0 算負報酬檔數', () => {
        const groups = groupByIndustry([trade({ industry: null, holdingReturn: 0 })]);
        expect(groups).toEqual([{ industry: '未分類', count: 1, avgReturn: 0, positive: 0, negative: 1 }]);
    });
});

describe('recentExits', () => {
    it('只留近 60 天出場，依出場日遞減', () => {
        const trades = [
            trade({ stockId: 'A', exitDate: '2026-09-15' }),
            trade({ stockId: 'B', exitDate: '2026-10-01' }),
            trade({ stockId: 'EDGE', exitDate: '2026-08-31' }), // 剛好 60 天前
            trade({ stockId: 'OLD', exitDate: '2026-08-30' }),
            trade({ stockId: 'HOLD' }),
        ];
        expect(recentExits(trades, AS_OF).map((t) => t.stockId)).toEqual(['B', 'A', 'EDGE']);
    });
});

describe('holdingDays', () => {
    it('進場日到最新資料日的日曆天數；缺日期回 null', () => {
        expect(holdingDays(trade({ entryDate: '2026-10-02', latestDate: '2026-10-30' }))).toBe(28);
        expect(holdingDays(trade({ entryDate: null }))).toBeNull();
    });
});
