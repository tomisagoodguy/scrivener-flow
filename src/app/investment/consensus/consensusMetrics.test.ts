import { formatCoverage, formatAvgWeight } from './consensusMetrics';

describe('formatCoverage', () => {
    // 來源：spec.md「Example: coverage values」表格
    it.each([
        [13, 22, '59.1%'],
        [22, 22, '100.0%'],
        [9, 18, '50.0%'],
    ])('etf_count=%i / active=%i → %s', (etfCount, activeEtfCount, expected) => {
        expect(formatCoverage(etfCount, activeEtfCount)).toBe(expected);
    });

    it('分母為 0 時回傳 — 且不除以零', () => {
        expect(formatCoverage(13, 0)).toBe('—');
    });
});

describe('formatAvgWeight', () => {
    // 來源：spec.md「Average weight computed per row」scenario
    it('total_weight=106.67 / etf_count=13 → 8.21%', () => {
        expect(formatAvgWeight(106.67, 13)).toBe('8.21%');
    });

    it('etf_count 為 0 時回傳 — 且不除以零', () => {
        expect(formatAvgWeight(50, 0)).toBe('—');
    });
});
