/**
 * Spec: Baseline comparison table on buying-patterns page
 *   - Table renders verdicts（徽章文字與台股色）
 *   - No stats yet
 */
import { render, screen, within } from '@testing-library/react';
import PatternBaselineTable from '../PatternBaselineTable';
import type { HorizonComparison, PatternStats } from '@/lib/investment/buyingPatternStats';

function cmp(overrides: Partial<HorizonComparison>): HorizonComparison {
    return {
        n: 759,
        winRate: 0.6,
        avgReturn: 0.05,
        baselineWinRate: 0.5,
        baselineAvgReturn: 0.02,
        excessWin: [0.02, 0.15],
        excessRet: [0.01, 0.05],
        verdict: 'better',
        ...overrides,
    };
}

function pattern(patternType: string, h20: HorizonComparison): PatternStats {
    return {
        patternType,
        n: h20.n,
        avgReturns: {},
        winRates: {},
        byHorizon: { '5': cmp({ verdict: 'indistinguishable', excessRet: [-0.01, 0.02] }), '10': cmp({}), '20': h20 },
        periodStart: '2026-05-04',
        periodEnd: '2026-10-30',
    };
}

describe('PatternBaselineTable', () => {
    it('renders verdict badges with Taiwan market colours', () => {
        render(
            <PatternBaselineTable
                stats={[
                    pattern('window_break', cmp({})),
                    pattern('sustained_buy', cmp({ n: 11, excessWin: null, excessRet: null, verdict: 'insufficient' })),
                ]}
            />,
        );

        const wbRow = screen.getByTestId('baseline-row-window_break-20');
        const better = within(wbRow).getByText('較好');
        expect(better.className).toContain('text-rose-600');

        const sbRow = screen.getByTestId('baseline-row-sustained_buy-20');
        const insufficient = within(sbRow).getByText('樣本不足');
        expect(insufficient.className).toContain('text-gray-500');
        expect(within(sbRow).getAllByText('—').length).toBeGreaterThanOrEqual(2);

        expect(screen.getByText('長期突破')).toBeInTheDocument();
        expect(screen.getByText(/2026-05-04～2026-10-30/)).toBeInTheDocument();
    });

    it('uses emerald for worse and gray for indistinguishable', () => {
        render(<PatternBaselineTable stats={[pattern('dip_buy', cmp({ verdict: 'worse', excessRet: [-0.04, -0.01] }))]} />);
        expect(within(screen.getByTestId('baseline-row-dip_buy-20')).getByText('較差').className).toContain('text-emerald-600');
        expect(within(screen.getByTestId('baseline-row-dip_buy-5')).getByText('分不出高低').className).toContain('text-gray-500');
    });

    it('formats near-zero interval bounds without a negative zero', () => {
        render(<PatternBaselineTable stats={[pattern('window_break', cmp({ excessWin: [-0.11, -0.0001] }))]} />);
        expect(within(screen.getByTestId('baseline-row-window_break-20')).getByText('-11.0 ～ 0.0 pp')).toBeInTheDocument();
    });

    it('shows a message when stats are not computed yet', () => {
        render(<PatternBaselineTable stats={[]} />);
        expect(screen.getByText(/統計尚未計算/)).toBeInTheDocument();
    });
});
