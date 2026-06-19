/**
 * Tests for active ETF derivation (Requirement: Active ETF derivation).
 *
 * TDD: Written BEFORE implementation. Covers the spec scenarios:
 *   - ETF with holdings is active (present in returned set)
 *   - ETF without holdings is inactive (e.g. 00998A absent)
 *   - registry order is preserved
 */

import { filterActiveEtfCodes } from '@/lib/investment/activeEtfs';

describe('filterActiveEtfCodes', () => {
    const codes = ['00981A', '00980A', '00998A', '00991A'];

    it('excludes a code with no snapshot rows (e.g. 00998A)', () => {
        const active = filterActiveEtfCodes(codes, ['00981A', '00980A', '00991A']);
        expect(active).not.toContain('00998A');
    });

    it('includes a code that has snapshot rows', () => {
        const active = filterActiveEtfCodes(codes, ['00981A']);
        expect(active).toContain('00981A');
    });

    it('preserves registry order regardless of present-set ordering', () => {
        const active = filterActiveEtfCodes(codes, ['00991A', '00980A', '00981A']);
        expect(active).toEqual(['00981A', '00980A', '00991A']);
    });

    it('returns an empty array when no code has rows', () => {
        expect(filterActiveEtfCodes(codes, [])).toEqual([]);
    });

    it('ignores present codes that are not in the registry list', () => {
        const active = filterActiveEtfCodes(codes, ['00981A', '9999X']);
        expect(active).toEqual(['00981A']);
    });
});
