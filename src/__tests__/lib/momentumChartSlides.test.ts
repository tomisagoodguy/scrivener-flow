/**
 * Tests for the momentum chart view formatting helpers in windowMomentumUtils.
 *
 * Spec: openspec/changes/momentum-chart-view/specs/momentum-chart-view/spec.md
 *   - Accumulating ETF tags on momentum chart：「<ETF> +<張>張」，netShares ÷ 1000 四捨五入、千分位
 *   - Momentum chart header summary：「<N> 家同步・權重 ±x.xxpp」
 *   - Accumulation date markers on momentum chart：合計 > 0 的日期，升冪
 */

import {
    computeAccumulationDates,
    formatMomentumEtfTags,
    formatMomentumHeader,
    type EtfAccumulationDetail,
} from '@/lib/investment/windowMomentumUtils';

function detail(etfCode: string, netShares: number): EtfAccumulationDetail {
    return { etfCode, netShares, netWeightChange: 0.1 };
}

describe('formatMomentumEtfTags', () => {
    it.each([
        [320_400, '00981A +320張'],
        [1_250_000, '00981A +1,250張'],
        [499, '00981A +0張'],
    ])('netShares %d → %s', (netShares, expected) => {
        expect(formatMomentumEtfTags([detail('00981A', netShares)])).toEqual([expected]);
    });

    it('keeps etfDetails order', () => {
        expect(
            formatMomentumEtfTags([detail('00981A', 320_400), detail('00980A', 1_250_000)]),
        ).toEqual(['00981A +320張', '00980A +1,250張']);
    });
});

describe('formatMomentumHeader', () => {
    it.each([
        [3, 1.254, '3 家同步・權重 +1.25pp'],
        [2, -0.5, '2 家同步・權重 -0.50pp'],
        [4, 0, '4 家同步・權重 +0.00pp'],
    ])('etfCount %d, weight %d → %s', (etfCount, weight, expected) => {
        expect(formatMomentumHeader(etfCount, weight)).toBe(expected);
    });
});

describe('computeAccumulationDates', () => {
    it('keeps only net-buy dates, sorted ascending', () => {
        expect(
            computeAccumulationDates({
                '2026-10-20': 5000,
                '2026-10-21': -2000,
                '2026-10-22': 0,
                '2026-10-17': 3000,
            }),
        ).toEqual(['2026-10-17', '2026-10-20']);
    });

    it('returns empty array for empty input', () => {
        expect(computeAccumulationDates({})).toEqual([]);
    });
});
