/**
 * Tests for sectorResonanceUtils.
 *
 * TDD: Written BEFORE implementation. Covers the spec scenarios of
 * "Sector resonance heat scores are derived from ETF sector activity":
 *   1. heat score ordering (more ETFs/stocks → higher score)
 *   2. empty activity map → empty result
 */

import { buildSectorResonanceHeat } from '@/lib/investment/sectorResonanceUtils';
import type { EtfSectorActivityMap } from '@/lib/investment/etfSectorActivityUtils';

describe('buildSectorResonanceHeat', () => {
    it('orders categories by heat score using the spec example table', () => {
        // ##### Example: heat score ordering
        // AI 伺服器: 6 etf, 18 stock -> highest
        // 航運: 3 etf, 7 stock -> medium
        // 傳產: 1 etf, 2 stock -> lowest
        const activityMap: EtfSectorActivityMap = {
            'AI 伺服器': {
                etf_codes: ['00981A', '00982A', '00983A', '00984A', '00985A', '00986A'],
                stock_codes: Array.from({ length: 18 }, (_, i) => `${2330 + i}`),
                stock_etf_map: {},
            },
            '航運': {
                etf_codes: ['00981A', '00982A', '00983A'],
                stock_codes: Array.from({ length: 7 }, (_, i) => `${2600 + i}`),
                stock_etf_map: {},
            },
            '傳產': {
                etf_codes: ['00981A'],
                stock_codes: ['1301', '1303'],
                stock_etf_map: {},
            },
        };

        const result = buildSectorResonanceHeat(activityMap);

        const ai = result.find(r => r.category === 'AI 伺服器')!;
        const shipping = result.find(r => r.category === '航運')!;
        const traditional = result.find(r => r.category === '傳產')!;

        expect(ai.heatScore).toBeGreaterThan(shipping.heatScore);
        expect(shipping.heatScore).toBeGreaterThan(traditional.heatScore);

        expect(ai.stockCount).toBe(18);
        expect(ai.etfCount).toBe(6);
        expect(shipping.stockCount).toBe(7);
        expect(shipping.etfCount).toBe(3);
        expect(traditional.stockCount).toBe(2);
        expect(traditional.etfCount).toBe(1);
    });

    it('returns an empty list when the activity map has no categories', () => {
        const result = buildSectorResonanceHeat({});
        expect(result).toEqual([]);
    });
});
