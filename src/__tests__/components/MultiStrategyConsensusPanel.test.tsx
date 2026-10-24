import React from 'react';
import { render, screen } from '@testing-library/react';
import MultiStrategyConsensusPanel, { type MultiConsensusEntry } from '@/components/features/strategy/MultiStrategyConsensusPanel';
import type { ConsensusParams } from '@/lib/investment/strategyConsensusUtils';

jest.mock('@/lib/investment/etfRegistry', () => ({
    getEtfMeta: (code: string) => ({
        color: '#3b82f6',
        name: `ETF ${code}`,
        shortCode: code.slice(0, 5),
    }),
}));

jest.mock('next/link', () => {
    const MockLink = ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
        <a href={href} className={className}>{children}</a>
    );
    MockLink.displayName = 'MockLink';
    return MockLink;
});

const refs = [
    { id: 'capital_layer', label: 'Capital Layer 多層籌碼選股' },
    { id: 'trend_template', label: '趨勢樣板選股' },
];

const twoStocks: MultiConsensusEntry[] = [
    { stock_id: '3055', name: '股票A', count: 3, industry: '半導體', strategies: refs, etfHolders: ['00981A'], movement: 'adding' },
    { stock_id: '2464', name: '股票B', count: 2, industry: '電子', strategies: refs, etfHolders: [], movement: 'holding' },
];

const strategies = [
    { id: 'capital_layer', label: 'Capital Layer 多層籌碼選股', date: '2026-10-10' },
    { id: 'trend_template', label: '趨勢樣板選股', date: '2026-10-22' },
];

const LATEST: ConsensusParams = { minCount: 2, view: 'list', window: 'latest' };

function renderPanel(overrides: Partial<React.ComponentProps<typeof MultiStrategyConsensusPanel>> = {}) {
    return render(
        <MultiStrategyConsensusPanel
            stocks={twoStocks}
            strategies={strategies}
            latestDate="2026-10-22"
            params={LATEST}
            {...overrides}
        />,
    );
}

describe('MultiStrategyConsensusPanel', () => {
    it('renders stock codes, count badges and industry', () => {
        renderPanel();
        expect(screen.getByText('3055')).toBeInTheDocument();
        expect(screen.getByText('2464')).toBeInTheDocument();
        expect(screen.getByText('3 策略')).toBeInTheDocument();
        expect(screen.getByText('2 策略')).toBeInTheDocument();
        expect(screen.getByText('半導體')).toBeInTheDocument();
    });

    it('shows movement badges with Taiwan colour convention', () => {
        renderPanel({ stocks: [{ ...twoStocks[0], movement: 'adding' }, { ...twoStocks[1], movement: 'reducing' }] });
        expect(screen.getByText('加碼中').className).toMatch(/rose/);
        expect(screen.getByText('減碼中').className).toMatch(/emerald/);
    });

    it('renders when only one stock qualifies', () => {
        renderPanel({ stocks: [twoStocks[0]] });
        expect(screen.getByText('3055')).toBeInTheDocument();
    });

    it('shows empty-state text with controls when zero stocks qualify', () => {
        renderPanel({ stocks: [] });
        expect(screen.getByText('多策略共選')).toBeInTheDocument();
        expect(screen.getByText('目前條件下無共選股')).toBeInTheDocument();
        expect(screen.getByText('≥3')).toBeInTheDocument();
    });

    it('does not render when fewer than two strategies', () => {
        const { container } = renderPanel({ strategies: [strategies[0]] });
        expect(container.firstChild).toBeNull();
    });

    it('lists each strategy data date and mutes dates older than latestDate', () => {
        renderPanel();
        expect(screen.getByText('10/10').className).toMatch(/text-gray-400/);
        expect(screen.getByText('10/22').className).not.toMatch(/text-gray-400/);
    });

    it('history mode shows window description instead of strategy dates', () => {
        renderPanel({ params: { ...LATEST, window: 14 } });
        expect(screen.getByText('統計區間：近 14 天（不同策略數）')).toBeInTheDocument();
        expect(screen.queryByText('10/10')).toBeNull();
    });

    it('matrix view renders a table', () => {
        renderPanel({ params: { ...LATEST, view: 'matrix' } });
        expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('renders link to /investment/stock/[code]', () => {
        renderPanel();
        const links = screen.getAllByRole('link');
        expect(links.some((l) => l.getAttribute('href') === '/investment/stock/3055')).toBe(true);
    });
});
