/**
 * buildHoldingMarks 測試（change: strategy-chart-holding-marks, task 1.1）
 * 把 strategy_trades 列彙整成每股「選」「買」日期與持有區間。
 */
import { buildHoldingMarks, type StrategyHoldingRow } from '@/lib/investment/strategyTradeUtils';

function row(overrides: Partial<StrategyHoldingRow>): StrategyHoldingRow {
    return {
        stock_id: '2330',
        entry_signal_date: '2026-09-30',
        entry_date: '2026-10-01',
        exit_date: null,
        ...overrides,
    };
}

describe('buildHoldingMarks', () => {
    it('依股票分組，選股日與買進日各自去重升冪', () => {
        const result = buildHoldingMarks([
            row({ entry_signal_date: '2026-09-30', entry_date: '2026-10-01', exit_date: null }),
            row({ entry_signal_date: '2026-08-29', entry_date: '2026-09-01', exit_date: '2026-09-10' }),
            // 另一策略同日選中、同區間 → 日期與區間都不重複
            row({ entry_signal_date: '2026-09-30', entry_date: '2026-10-01', exit_date: null }),
            row({ stock_id: '2454', entry_signal_date: '2026-09-12', entry_date: '2026-09-15', exit_date: '2026-10-05' }),
        ]);

        expect(result['2330'].signalDates).toEqual(['2026-08-29', '2026-09-30']);
        expect(result['2330'].entryDates).toEqual(['2026-09-01', '2026-10-01']);
        expect(result['2330'].periods).toEqual([
            { start: '2026-09-01', end: '2026-09-10' },
            { start: '2026-10-01', end: null },
        ]);
        expect(result['2454']).toEqual({
            signalDates: ['2026-09-12'],
            entryDates: ['2026-09-15'],
            periods: [{ start: '2026-09-15', end: '2026-10-05' }],
        });
    });

    it('entry_date 為 null（待進場）→ 只有選股日，不產生買進日與區間', () => {
        const result = buildHoldingMarks([row({ entry_signal_date: '2026-10-30', entry_date: null, exit_date: null })]);

        expect(result['2330']).toEqual({ signalDates: ['2026-10-30'], entryDates: [], periods: [] });
    });

    it('空輸入 → 空物件', () => {
        expect(buildHoldingMarks([])).toEqual({});
    });
});
