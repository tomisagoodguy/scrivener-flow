/**
 * Spec: Margin regime card on market chips page
 *   - Margin high with indistinguishable risk
 *   - No data
 */
import { render, screen } from '@testing-library/react';
import { MarginRegimeCard } from '../MarginRegimeCard';
import type { MarginRegime } from '@/lib/investment/marginRegime';

function regime(overrides: Partial<MarginRegime>): MarginRegime {
    return {
        date: '2026-10-13',
        margin_balance: 8817.2,
        margin_1y_high: true,
        index_near_high: true,
        stats: {
            margin_high: { n: 588, dd10_rate: 0.1378, mean_ret60: 0.0435 },
            all: { n: 4561, dd10_rate: 0.2008, mean_ret60: 0.0287 },
            index_high_only: { n: 196, dd10_rate: 0.102, mean_ret60: 0.0358 },
            diff: {
                margin_high_vs_all: { lo: -0.136, hi: 0.015 },
                margin_high_vs_index_high_only: { lo: -0.032, hi: 0.142 },
            },
            shadow: { margin_high: 0.935, all: 0.4 },
            sample_start: '2008-01-04',
            sample_end: '2026-08-03',
        },
        ...overrides,
    };
}

describe('MarginRegimeCard', () => {
    it('shows a neutral margin-high label and the indistinguishable conclusion', () => {
        const { container } = render(<MarginRegimeCard data={regime({})} />);

        const label = screen.getByTestId('margin-high-label');
        expect(label.textContent).toBe('融資創一年新高');
        expect(label.className).toContain('text-gray');
        expect(screen.getByText(/8,817 億/)).toBeInTheDocument();
        const conclusion = screen.getByTestId('margin-high-conclusion');
        expect(conclusion.textContent).toContain('分不出高低');
        expect(conclusion.textContent).toContain('-13.6 ～ +1.5 pp');
        expect(screen.getByTestId('margin-shadow').textContent).toContain('94%');
        expect(screen.getByTestId('margin-shadow').textContent).toContain('40%');
        expect(screen.getByText(/2008-01-04～2026-08-03/)).toBeInTheDocument();
        expect(screen.getByText(/非預測或投資建議/)).toBeInTheDocument();
        expect(container.innerHTML).not.toMatch(/rose|emerald/);
    });

    it('lists the three groups with counts and drawdown rates', () => {
        render(<MarginRegimeCard data={regime({})} />);
        expect(screen.getByTestId('group-margin_high').textContent).toMatch(/588.*14%/);
        expect(screen.getByTestId('group-index_high_only').textContent).toMatch(/196.*10%/);
        expect(screen.getByTestId('group-all').textContent).toMatch(/4,561.*20%/);
    });

    it('shows a neutral 未創一年新高 label when not at a one-year high', () => {
        render(<MarginRegimeCard data={regime({ margin_1y_high: false })} />);
        expect(screen.getByTestId('margin-high-label').textContent).toBe('未創一年新高');
    });

    it('uses an insufficient-sample sentence when the interval is null', () => {
        const base = regime({});
        render(<MarginRegimeCard data={{ ...base, stats: { ...base.stats, diff: { margin_high_vs_all: null, margin_high_vs_index_high_only: null } } }} />);
        const conclusion = screen.getByTestId('margin-high-conclusion').textContent ?? '';
        expect(conclusion).toContain('樣本不足，無法與平常日比較');
        expect(conclusion).not.toContain('區間 —');
    });

    it('shows a placeholder when there is no data', () => {
        render(<MarginRegimeCard data={null} />);
        expect(screen.getByText('融資狀態尚未更新')).toBeInTheDocument();
    });
});
