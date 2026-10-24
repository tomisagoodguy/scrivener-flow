import { buildConsensusMatrix, formatMonthDay, shortStrategyLabel } from '@/lib/investment/strategyConsensusUtils';
import type { MultiConsensusEntry } from '@/lib/investment/strategyConsensusUtils';

function entry(stock_id: string, ids: string[]): MultiConsensusEntry {
    return {
        stock_id,
        name: null,
        industry: null,
        count: ids.length,
        strategies: ids.map((id) => ({ id, label: id })),
    };
}

describe('buildConsensusMatrix', () => {
    it('orders columns by selected row count desc then id asc, cells reflect selections (spec example)', () => {
        const entries = [
            entry('3055', ['capital_layer', 'low_vol_alpha', 'trend_template']),
            entry('2464', ['capital_layer', 'trend_template']),
        ];
        const matrix = buildConsensusMatrix(entries, { trend_template: '2026-10-22' });

        expect(matrix.columns.map((c) => c.id)).toEqual(['capital_layer', 'trend_template', 'low_vol_alpha']);
        expect(matrix.columns[1].date).toBe('2026-10-22');
        expect(matrix.columns[0].date).toBeUndefined();
        expect(matrix.rows[0].entry.stock_id).toBe('3055');
        expect(matrix.rows[0].cells).toEqual([true, true, true]);
        expect(matrix.rows[1].cells).toEqual([true, true, false]);
    });

    it('returns empty columns and rows for empty entries', () => {
        expect(buildConsensusMatrix([])).toEqual({ columns: [], rows: [] });
    });
});

describe('formatMonthDay / shortStrategyLabel', () => {
    it('formats ISO date as MM/DD', () => {
        expect(formatMonthDay('2026-10-10')).toBe('10/10');
    });

    it('truncates labels longer than 8 chars with ellipsis', () => {
        expect(shortStrategyLabel('趨勢樣板選股')).toBe('趨勢樣板選股');
        expect(shortStrategyLabel('Capital Layer 多層籌碼選股')).toBe('Capital …');
    });
});
