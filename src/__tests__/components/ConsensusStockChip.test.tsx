import React from 'react';
import { render, screen } from '@testing-library/react';
import ConsensusStockChip from '@/components/features/strategy/ConsensusStockChip';
import type { MultiConsensusEntry } from '@/lib/investment/strategyConsensusUtils';

jest.mock('@/lib/investment/etfRegistry', () => ({
    getEtfMeta: (code: string) => ({ color: '#3b82f6', name: `ETF ${code}`, shortCode: code.slice(0, 5) }),
}));

jest.mock('next/link', () => {
    const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>;
    MockLink.displayName = 'MockLink';
    return MockLink;
});

const strategies = [
    { id: 'capital_layer', label: 'Capital Layer 多層籌碼選股' },
    { id: 'trend_template', label: '趨勢樣板選股' },
];

describe('ConsensusStockChip', () => {
    it('shows strategy name badges with full label as title', () => {
        const entry: MultiConsensusEntry = {
            stock_id: '3055', name: '股票A', count: 2, industry: '半導體', strategies,
            etfHolders: [], movement: 'adding',
        };
        render(<ConsensusStockChip stock={entry} />);
        expect(screen.getByText('趨勢樣板選股')).toBeInTheDocument();
        expect(screen.getByTitle('Capital Layer 多層籌碼選股')).toBeInTheDocument();
        expect(screen.getByText('加碼中')).toBeInTheDocument();
    });

    it('history entry omits movement and shows last selected date', () => {
        const entry: MultiConsensusEntry = {
            stock_id: '2330', name: '台積電', count: 2, industry: null, strategies, lastDate: '2026-10-21',
        };
        render(<ConsensusStockChip stock={entry} />);
        expect(screen.queryByText('未持有')).toBeNull();
        expect(screen.getByText('10/21')).toBeInTheDocument();
    });
});
