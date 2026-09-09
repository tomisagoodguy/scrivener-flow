/**
 * Tests for getSectorResonanceHeat server action.
 *
 * TDD: Written BEFORE implementation. Covers "Sector resonance heat scores
 * are derived from ETF sector activity" wiring: the action fetches
 * EtfSectorActivityMap via getEtfSectorActivity() and returns the heat list
 * shaped { category, heatScore, stockCount, etfCount }[].
 */

jest.mock('../getEtfSectorActivity', () => ({
    getEtfSectorActivity: jest.fn(),
}));

import { getSectorResonanceHeat } from '../getSectorResonanceHeat';
import { getEtfSectorActivity } from '../getEtfSectorActivity';

describe('getSectorResonanceHeat', () => {
    it('returns heat entries shaped from the ETF sector activity map', async () => {
        (getEtfSectorActivity as jest.Mock).mockResolvedValue({
            'AI 伺服器': {
                etf_codes: ['00981A', '00982A'],
                stock_codes: ['2330', '2454'],
                stock_etf_map: {},
            },
        });

        const result = await getSectorResonanceHeat('2026-07-10');

        expect(getEtfSectorActivity).toHaveBeenCalledWith('2026-07-10');
        expect(result).toEqual([
            { category: 'AI 伺服器', heatScore: expect.any(Number), stockCount: 2, etfCount: 2 },
        ]);
    });

    it('returns an empty list when the activity map is empty', async () => {
        (getEtfSectorActivity as jest.Mock).mockResolvedValue({});

        const result = await getSectorResonanceHeat('2026-07-10');

        expect(result).toEqual([]);
    });
});
