/**
 * Spec: Historical drawdown statistics by margin state — Interval semantics
 */
import { describeDiff, formatPpInterval } from '../marginRegime';

describe('describeDiff', () => {
    it.each([
        [{ lo: -0.136, hi: 0.015 }, 'indistinguishable'],
        [{ lo: 0.02, hi: 0.1 }, 'higher'],
        [{ lo: -0.1, hi: -0.02 }, 'lower'],
        [null, 'insufficient'],
    ] as const)('%p → %s', (ci, expected) => {
        expect(describeDiff(ci)).toBe(expected);
    });
});

describe('formatPpInterval', () => {
    it('formats bounds in percentage points with sign', () => {
        expect(formatPpInterval({ lo: -0.13567, hi: 0.01534 })).toBe('-13.6 ～ +1.5 pp');
    });

    it('returns a dash for null', () => {
        expect(formatPpInterval(null)).toBe('—');
    });
});
