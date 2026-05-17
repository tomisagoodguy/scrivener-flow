/**
 * TDD: Written BEFORE implementation.
 * Tests for buildEtfSectorActivityMap utility — the pure business logic
 * extracted from the getEtfSectorActivity Server Action.
 */

import { buildEtfSectorActivityMap } from '@/lib/investment/etfSectorActivityUtils';

type DiffLogEntry = {
    stock_code: string;
    etf_code: string;
    diff_weight: number;
    change_type: string;
};

describe('buildEtfSectorActivityMap', () => {
    it('maps multi-ETF multi-stock sector (spec example)', () => {
        // GIVEN category '半導體' contains stocks 2330, 2303
        // AND: 00981A BUY 2330 (0.12), 00980A IN 2303 (0.30), 00981A BUY 2303 (0.08)
        // THEN: '半導體' = { etf_codes: ['00981A', '00980A'], stock_codes: ['2330', '2303'] }
        const stockToCategory = new Map([
            ['2330', '半導體'],
            ['2303', '半導體'],
        ]);
        const diffLogs: DiffLogEntry[] = [
            { stock_code: '2330', etf_code: '00981A', diff_weight: 0.12, change_type: 'BUY' },
            { stock_code: '2303', etf_code: '00980A', diff_weight: 0.30, change_type: 'IN' },
            { stock_code: '2303', etf_code: '00981A', diff_weight: 0.08, change_type: 'BUY' },
        ];
        const result = buildEtfSectorActivityMap(stockToCategory, diffLogs);
        expect(result['半導體'].etf_codes).toHaveLength(2);
        expect(result['半導體'].etf_codes).toEqual(expect.arrayContaining(['00981A', '00980A']));
        expect(result['半導體'].stock_codes).toHaveLength(2);
        expect(result['半導體'].stock_codes).toEqual(expect.arrayContaining(['2330', '2303']));
        // Per-stock ETF mapping: 2330 only bought by 00981A, 2303 by both
        expect(result['半導體'].stock_etf_map['2330']).toEqual(['00981A']);
        expect(result['半導體'].stock_etf_map['2303']).toEqual(expect.arrayContaining(['00980A', '00981A']));
        expect(result['半導體'].stock_etf_map['2303']).toHaveLength(2);
    });

    it('excludes events below 0.05 threshold (abs diff_weight)', () => {
        // WHEN abs(diff_weight) = 0.03 → excluded
        const stockToCategory = new Map([['2330', '半導體']]);
        const diffLogs: DiffLogEntry[] = [
            { stock_code: '2330', etf_code: '00981A', diff_weight: 0.03, change_type: 'BUY' },
        ];
        const result = buildEtfSectorActivityMap(stockToCategory, diffLogs);
        expect(result['半導體']).toBeUndefined();
    });

    it('includes event at exactly 0.05 threshold', () => {
        const stockToCategory = new Map([['2330', '半導體']]);
        const diffLogs: DiffLogEntry[] = [
            { stock_code: '2330', etf_code: '00981A', diff_weight: 0.05, change_type: 'BUY' },
        ];
        const result = buildEtfSectorActivityMap(stockToCategory, diffLogs);
        expect(result['半導體']).toBeDefined();
        expect(result['半導體'].etf_codes).toContain('00981A');
    });

    it('deduplicates etf_codes and stock_codes across multiple events', () => {
        const stockToCategory = new Map([['2330', '半導體']]);
        const diffLogs: DiffLogEntry[] = [
            { stock_code: '2330', etf_code: '00981A', diff_weight: 0.12, change_type: 'BUY' },
            { stock_code: '2330', etf_code: '00981A', diff_weight: 0.15, change_type: 'BUY' },
        ];
        const result = buildEtfSectorActivityMap(stockToCategory, diffLogs);
        expect(result['半導體'].etf_codes).toHaveLength(1);
        expect(result['半導體'].stock_codes).toHaveLength(1);
    });

    it('ignores stocks not in stockToCategory map', () => {
        const stockToCategory = new Map<string, string>();
        const diffLogs: DiffLogEntry[] = [
            { stock_code: '2330', etf_code: '00981A', diff_weight: 0.12, change_type: 'BUY' },
        ];
        const result = buildEtfSectorActivityMap(stockToCategory, diffLogs);
        expect(Object.keys(result)).toHaveLength(0);
    });

    it('returns empty object when diffLogs is empty', () => {
        const stockToCategory = new Map([['2330', '半導體']]);
        const result = buildEtfSectorActivityMap(stockToCategory, []);
        expect(result).toEqual({});
    });

    it('groups stocks across multiple categories correctly', () => {
        const stockToCategory = new Map([
            ['2330', '半導體'],
            ['2412', '電信業'],
        ]);
        const diffLogs: DiffLogEntry[] = [
            { stock_code: '2330', etf_code: '00981A', diff_weight: 0.12, change_type: 'BUY' },
            { stock_code: '2412', etf_code: '00980A', diff_weight: 0.08, change_type: 'IN' },
        ];
        const result = buildEtfSectorActivityMap(stockToCategory, diffLogs);
        expect(result['半導體'].stock_codes).toContain('2330');
        expect(result['半導體'].etf_codes).toContain('00981A');
        expect(result['電信業'].stock_codes).toContain('2412');
        expect(result['電信業'].etf_codes).toContain('00980A');
        expect(result['半導體'].stock_codes).not.toContain('2412');
    });
});
