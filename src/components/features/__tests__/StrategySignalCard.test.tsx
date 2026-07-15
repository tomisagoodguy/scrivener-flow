import React from 'react';
import { render, screen } from '@testing-library/react';
import StrategySignalCard from '../StrategySignalCard';
import type { StrategyEntry } from '@/lib/investment/strategyUtils';

jest.mock('@/lib/investment/etfRegistry', () => ({
    getEtfMeta: (code: string) => ({
        color: '#3b82f6',
        name: `ETF ${code}`,
        shortCode: code.slice(0, 5),
    }),
}));

jest.mock('next/link', () => {
    const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    );
    MockLink.displayName = 'MockLink';
    return MockLink;
});

function makeStrategy(overrides: Partial<StrategyEntry['stocks'][number]> = {}): StrategyEntry {
    return {
        id: 'capital_layer',
        description: '資金階層策略',
        stocks: [
            {
                stock_id: '2317',
                score: 0.8,
                movement: 'none',
                name: '鴻海',
                industry: null,
                etfHolders: [],
                avg_turnover: null,
                liquidity_flag: null,
                ...overrides,
            },
        ],
    };
}

describe('StrategySignalCard — liquidity warning badge', () => {
    it('renders amber "低流動" badge with 億-yuan turnover when liquidity_flag is true', () => {
        // Scenario: Low-liquidity stock rendered with badge
        const strategy = makeStrategy({ liquidity_flag: true, avg_turnover: 30_000_000 });
        render(<StrategySignalCard strategy={strategy} />);

        const badge = screen.getByText((_, element) => element?.textContent?.startsWith('低流動') ?? false);
        expect(badge).toBeInTheDocument();
        expect(badge.className).toContain('amber');
        expect(badge.className).not.toContain('rose');
        expect(badge.className).not.toContain('emerald');
        // 30,000,000 元 = 0.3 億元
        expect(badge.textContent).toMatch(/0\.3\s*億/);
    });

    it('renders nothing extra when liquidity_flag is false', () => {
        // Scenario: Unknown liquidity renders unchanged (also covers false)
        const strategy = makeStrategy({ liquidity_flag: false, avg_turnover: 200_000_000 });
        render(<StrategySignalCard strategy={strategy} />);

        expect(screen.queryByText('低流動')).not.toBeInTheDocument();
    });

    it('renders nothing extra when liquidity_flag is null (historical rows / unknown)', () => {
        // Scenario: Unknown liquidity renders unchanged
        const strategy = makeStrategy({ liquidity_flag: null, avg_turnover: null });
        render(<StrategySignalCard strategy={strategy} />);

        expect(screen.queryByText('低流動')).not.toBeInTheDocument();
    });
});
