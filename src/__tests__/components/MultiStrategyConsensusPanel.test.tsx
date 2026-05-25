import React from 'react';
import { render, screen } from '@testing-library/react';
import MultiStrategyConsensusPanel, { type MultiConsensusEntry } from '@/components/features/strategy/MultiStrategyConsensusPanel';

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

const twoStocks: MultiConsensusEntry[] = [
    { stock_id: '3055', name: '股票A', count: 3, industry: '半導體', etfHolders: ['00981A'], movement: 'adding' },
    { stock_id: '2464', name: '股票B', count: 2, industry: '電子', etfHolders: [], movement: 'holding' },
];

describe('MultiStrategyConsensusPanel', () => {
    it('renders stock codes when stocks.length >= 2', () => {
        render(<MultiStrategyConsensusPanel stocks={twoStocks} />);
        expect(screen.getByText(/3055/)).toBeInTheDocument();
        expect(screen.getByText(/2464/)).toBeInTheDocument();
    });

    it('shows strategy count badge', () => {
        render(<MultiStrategyConsensusPanel stocks={twoStocks} />);
        expect(screen.getByText('3 策略')).toBeInTheDocument();
        expect(screen.getByText('2 策略')).toBeInTheDocument();
    });

    it('shows industry tag', () => {
        render(<MultiStrategyConsensusPanel stocks={twoStocks} />);
        expect(screen.getByText('半導體')).toBeInTheDocument();
    });

    it('shows movement badge with correct label', () => {
        render(<MultiStrategyConsensusPanel stocks={twoStocks} />);
        expect(screen.getByText('加碼中')).toBeInTheDocument();
        expect(screen.getByText('持倉中')).toBeInTheDocument();
    });

    it('does not render when stocks.length < 2', () => {
        const { container } = render(<MultiStrategyConsensusPanel stocks={[twoStocks[0]]} />);
        expect(container.firstChild).toBeNull();
    });

    it('does not render when stocks array is empty', () => {
        const { container } = render(<MultiStrategyConsensusPanel stocks={[]} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders link to /investment/stock/[code]', () => {
        render(<MultiStrategyConsensusPanel stocks={twoStocks} />);
        const links = screen.getAllByRole('link');
        expect(links.some((l) => l.getAttribute('href')?.includes('/investment/stock/3055'))).toBe(true);
    });

    it('shows adding movement badge in rose class', () => {
        render(<MultiStrategyConsensusPanel stocks={twoStocks} />);
        const badge = screen.getByText('加碼中');
        expect(badge.className).toMatch(/rose/);
    });

    it('shows reducing movement badge in emerald class', () => {
        const withReducing: MultiConsensusEntry[] = [
            { ...twoStocks[0], movement: 'reducing' },
            { ...twoStocks[1], movement: 'none' },
        ];
        render(<MultiStrategyConsensusPanel stocks={withReducing} />);
        const badge = screen.getByText('減碼中');
        expect(badge.className).toMatch(/emerald/);
    });
});
