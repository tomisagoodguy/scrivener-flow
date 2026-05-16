/**
 * Tests for getStrategySignals Server Action.
 *
 * TDD: Written BEFORE implementation. Verifies movement label calculation
 * for all four scenarios from spec.
 */

import { computeMovement } from '@/lib/investment/strategyUtils';

describe('computeMovement', () => {
    const etf = '00981A';

    it('returns "adding" when stock has BUY/IN event with diff_weight > 0 in last 7 days', () => {
        // Scenario: Stock with recent buy event
        // GIVEN stock 2330 has a BUY event with diff_weight = 0.12
        // THEN label is "adding"
        const holdings = new Set(['2330']);
        const diffEvents = [
            { stock_id: '2330', change_type: 'BUY', diff_weight: 0.12 },
        ];
        expect(computeMovement('2330', holdings, diffEvents)).toBe('adding');
    });

    it('returns "reducing" when stock has SELL/OUT event with diff_weight < 0', () => {
        const holdings = new Set(['2330']);
        const diffEvents = [
            { stock_id: '2330', change_type: 'SELL', diff_weight: -0.08 },
        ];
        expect(computeMovement('2330', holdings, diffEvents)).toBe('reducing');
    });

    it('returns "holding" when stock is in holdings but has no recent diff event', () => {
        const holdings = new Set(['2330']);
        const diffEvents: { stock_id: string; change_type: string; diff_weight: number }[] = [];
        expect(computeMovement('2330', holdings, diffEvents)).toBe('holding');
    });

    it('returns "none" when stock is not present in etf_holdings_snapshot', () => {
        // Scenario: Stock not held by 00981A
        // GIVEN a strategy stock has no row in etf_holdings_snapshot
        // THEN the label shown is "none"
        const holdings = new Set<string>();
        const diffEvents: { stock_id: string; change_type: string; diff_weight: number }[] = [];
        expect(computeMovement('9999', holdings, diffEvents)).toBe('none');
    });

    it('returns "adding" for IN event with diff_weight > 0', () => {
        const holdings = new Set(['6547']);
        const diffEvents = [
            { stock_id: '6547', change_type: 'IN', diff_weight: 0.05 },
        ];
        expect(computeMovement('6547', holdings, diffEvents)).toBe('adding');
    });

    it('returns "reducing" for OUT event with diff_weight < 0', () => {
        const holdings = new Set(['6547']);
        const diffEvents = [
            { stock_id: '6547', change_type: 'OUT', diff_weight: -0.03 },
        ];
        expect(computeMovement('6547', holdings, diffEvents)).toBe('reducing');
    });
});
