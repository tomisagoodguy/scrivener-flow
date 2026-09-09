/**
 * Tests for sectorResonanceLayout.
 *
 * TDD: Written BEFORE implementation. Covers:
 *   "Bubble chart renders force-directed collision layout"
 *     - bubbles do not overlap
 *     - higher heat score produces larger bubble
 *   "Bubble color encodes heat quartile, not gain/loss"
 *     - top-quartile category gets the most intense color
 *     - color scale never uses rose/emerald (gain/loss) colors
 */

import { layoutResonanceBubbles, getHeatQuartileColor } from '@/lib/investment/sectorResonanceLayout';
import type { SectorResonanceHeat } from '@/lib/investment/sectorResonanceUtils';

const sample: SectorResonanceHeat[] = [
    { category: 'AI 伺服器', heatScore: 36, stockCount: 18, etfCount: 6 },
    { category: '航運', heatScore: 16, stockCount: 7, etfCount: 3 },
    { category: '傳產', heatScore: 5, stockCount: 2, etfCount: 1 },
    { category: '金融', heatScore: 24, stockCount: 10, etfCount: 4 },
    { category: '生技', heatScore: 12, stockCount: 5, etfCount: 2 },
    { category: '半導體設備', heatScore: 30, stockCount: 14, etfCount: 5 },
    { category: '電動車', heatScore: 9, stockCount: 4, etfCount: 1 },
    { category: '綠能', heatScore: 20, stockCount: 8, etfCount: 3 },
];

describe('layoutResonanceBubbles', () => {
    it('returns an empty list for empty input', () => {
        expect(layoutResonanceBubbles([])).toEqual([]);
    });

    it('produces larger radius for higher heat score', () => {
        const nodes = layoutResonanceBubbles(sample);
        const ai = nodes.find(n => n.category === 'AI 伺服器')!;
        const traditional = nodes.find(n => n.category === '傳產')!;
        expect(ai.r).toBeGreaterThan(traditional.r);
    });

    it('produces non-overlapping bubble positions', () => {
        const nodes = layoutResonanceBubbles(sample);
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const a = nodes[i];
                const b = nodes[j];
                const dist = Math.hypot((a.x ?? 0) - (b.x ?? 0), (a.y ?? 0) - (b.y ?? 0));
                // small tolerance for force-simulation floating-point residual
                expect(dist).toBeGreaterThanOrEqual(a.r + b.r - 1);
            }
        }
    });
});

describe('getHeatQuartileColor', () => {
    const scores = sample.map(s => s.heatScore);

    it('gives the top-quartile category the most intense color', () => {
        const topColor = getHeatQuartileColor(36, scores); // highest score in sample
        const bottomColor = getHeatQuartileColor(5, scores); // lowest score in sample
        expect(topColor).not.toBe(bottomColor);
        // most intense color is the last entry in the scale
        const scale = getHeatQuartileColor.SCALE;
        expect(topColor).toBe(scale[scale.length - 1]);
        expect(bottomColor).toBe(scale[0]);
    });

    it('never returns a rose or emerald gain/loss color', () => {
        for (const score of scores) {
            const color = getHeatQuartileColor(score, scores);
            expect(color.toLowerCase()).not.toMatch(/rose|emerald/);
        }
    });
});
