import React from 'react';
import { render, screen, within } from '@testing-library/react';
import ConsensusMatrix from '@/components/features/strategy/ConsensusMatrix';
import type { MultiConsensusEntry } from '@/lib/investment/strategyConsensusUtils';

jest.mock('next/link', () => {
    const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>;
    MockLink.displayName = 'MockLink';
    return MockLink;
});

function entry(stock_id: string, ids: string[]): MultiConsensusEntry {
    return { stock_id, name: `名${stock_id}`, industry: null, count: ids.length, strategies: ids.map((id) => ({ id, label: id })) };
}

describe('ConsensusMatrix', () => {
    const stocks = [
        entry('3055', ['capital_layer', 'low_vol_alpha', 'trend_template']),
        entry('2464', ['capital_layer', 'trend_template']),
    ];

    it('fills cells for selected strategies (3055 three, 2464 two)', () => {
        render(<ConsensusMatrix stocks={stocks} strategyDates={{ capital_layer: '2026-10-10' }} />);
        const rows = screen.getAllByRole('row');
        // rows[0] 為表頭
        expect(within(rows[1]).getAllByLabelText('已選中')).toHaveLength(3);
        expect(within(rows[2]).getAllByLabelText('已選中')).toHaveLength(2);
        expect(screen.getByText('10/10')).toBeInTheDocument();
    });

    it('row header links to stock page', () => {
        render(<ConsensusMatrix stocks={stocks} />);
        expect(screen.getByText('3055').closest('a')!.getAttribute('href')).toBe('/investment/stock/3055');
    });

    it('shows empty state without table when no stocks', () => {
        render(<ConsensusMatrix stocks={[]} />);
        expect(screen.queryByRole('table')).toBeNull();
        expect(screen.getByText('目前條件下無共選股')).toBeInTheDocument();
    });
});
