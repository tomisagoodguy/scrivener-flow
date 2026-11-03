/**
 * taiexRegime 顯示輔助（change: taiex-ma60-regime，spec「Regime card on the breadth page」）：
 * 站上中顯示 next_break_type 那類統計；跌破中顯示開啟這段跌破的那類。
 */
import { formatSignedPct, relevantBreakClass } from '../taiexRegime';

describe('relevantBreakClass', () => {
    it.each([
        ['above', 'rebreak_rising', 'rebreak_rising'],
        ['above', 'first_break', 'first_break'],
        ['above', null, null],
        ['below_after_first_break', null, 'first_break'],
        ['below_after_rebreak', null, 'rebreak_rising'],
        ['below_ma_falling', null, 'break_falling'],
    ] as const)('state=%s next=%s → %s', (state, next, expected) => {
        expect(relevantBreakClass(state, next)).toBe(expected);
    });
});

describe('formatSignedPct', () => {
    it.each([
        [0.0213, '+2.13%'],
        [-0.0235, '-2.35%'],
        [0, '+0.00%'],
        [null, '—'],
    ] as const)('%s → %s', (value, expected) => {
        expect(formatSignedPct(value)).toBe(expected);
    });
});
