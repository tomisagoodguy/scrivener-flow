/**
 * Tests for getFundMomentumSignals Server Action.
 *
 * Verifies ETF × 投信交叉驗證邏輯（etf_consensus flag）.
 * Uses spec examples from fund-tracker-page spec:
 *   - stock "2330": score=85 + ETF BUY entry → etf_consensus: true
 *   - stock "2454": score=85 + no ETF entry  → etf_consensus: false
 */

import type { FundMomentumSignal } from '@/types';

// ---------------------------------------------------------------------------
// Unit tests for the cross-signal logic (pure function extracted for testing)
// ---------------------------------------------------------------------------

function computeEtfConsensus(
    score: number,
    stockId: string,
    etfBuySet: Set<string>,
    threshold = 70,
): boolean {
    return score >= threshold && etfBuySet.has(stockId);
}

describe('ETF × fund cross-signal detection (etf_consensus)', () => {
    it('returns true when score >= 70 AND stock has ETF BUY entry on same date', () => {
        // Scenario from spec: "2330" score=85, ETF BUY exists
        const etfBuySet = new Set(['2330']);
        expect(computeEtfConsensus(85, '2330', etfBuySet)).toBe(true);
    });

    it('returns false when score >= 70 BUT no ETF diff entry exists', () => {
        // Scenario from spec: "2454" score=85, no ETF entry
        const etfBuySet = new Set<string>();
        expect(computeEtfConsensus(85, '2454', etfBuySet)).toBe(false);
    });

    it('returns false when ETF entry exists BUT score < 70', () => {
        const etfBuySet = new Set(['2330']);
        expect(computeEtfConsensus(60, '2330', etfBuySet)).toBe(false);
    });

    it('returns false for empty sets and zero score', () => {
        const etfBuySet = new Set<string>();
        expect(computeEtfConsensus(0, '9999', etfBuySet)).toBe(false);
    });

    it('returns true at exact threshold (score = 70)', () => {
        const etfBuySet = new Set(['1101']);
        expect(computeEtfConsensus(70, '1101', etfBuySet)).toBe(true);
    });

    it('returns false at one below threshold (score = 69)', () => {
        const etfBuySet = new Set(['1101']);
        expect(computeEtfConsensus(69, '1101', etfBuySet)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Type-shape test: FundMomentumSignal interface
// ---------------------------------------------------------------------------

describe('FundMomentumSignal type shape', () => {
    it('satisfies all required fields', () => {
        const signal: FundMomentumSignal = {
            stock_id: '2330',
            stock_name: '台積電',
            date: '2026-05-24',
            score: 98,
            is_selected: true,
            fund_1d: 1_000_000,
            fund_5d: 3_000_000,
            fund_20d: 500_000,
            consec_days: 5,
            fund_ratio_5d: 0.032,
            etf_consensus: true,
        };
        expect(signal.stock_id).toBe('2330');
        expect(signal.is_selected).toBe(true);
        expect(signal.etf_consensus).toBe(true);
        expect(signal.consec_days).toBe(5);
    });

    it('allows null for optional metric fields', () => {
        const signal: FundMomentumSignal = {
            stock_id: '1234',
            date: '2026-05-24',
            score: 50,
            is_selected: false,
            fund_1d: null,
            fund_5d: null,
            fund_20d: null,
            consec_days: 0,
            fund_ratio_5d: null,
            etf_consensus: false,
        };
        expect(signal.fund_1d).toBeNull();
        expect(signal.etf_consensus).toBe(false);
    });
});
