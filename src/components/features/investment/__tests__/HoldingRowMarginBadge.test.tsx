/**
 * ETF 持股列「前20%」高融資標籤（change: margin-usage-percentile-risk）。
 * 涵蓋 spec：High margin holding badge。
 */
import { render, screen } from '@testing-library/react';
import { HoldingRow } from '@/components/features/investment/HoldingRow';
import type { Holding } from '@/types/investment';

function holding(margin_pct_rank: number | null): Holding {
    return {
        stock_id: '2330',
        stock_code: '2330',
        stock_name: '台積電',
        shares: 1000,
        weight: 5,
        price: 1000,
        change_percent: 1,
        amount: 1e9,
        currency: 'TWD',
        margin_ratio: 23.4,
        margin_pct_rank,
        is_disposal: false,
    };
}

function renderRow(pct: number | null) {
    return render(
        <table>
            <tbody>
                <HoldingRow item={holding(pct)} maxAmount={1e9} onClick={() => {}} />
            </tbody>
        </table>
    );
}

describe('HoldingRow high margin badge', () => {
    it('shows the amber 前20% badge at percentile 80.0', () => {
        renderRow(80.0);
        const badge = screen.getByText('前20%');
        expect(badge.className).toContain('bg-amber-100');
        expect(badge.getAttribute('title')).toBe('當日全市場融資使用率百分位 P80');
    });

    it.each([79.9, null])('shows no badge at percentile %p but keeps the margin value', (pct) => {
        renderRow(pct);
        expect(screen.queryByText('前20%')).toBeNull();
        expect(screen.getByText('23.4%')).toBeTruthy();
    });

    it('does not color the margin value with fixed thresholds', () => {
        renderRow(null);
        const value = screen.getByText('23.4%');
        expect(value.className).not.toMatch(/orange|red-|blue-/);
    });
});
