import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SectorOverviewView, type SectorEntry } from '../DailyFlowPanel';

const sectors: SectorEntry[] = [
    {
        sector: '被動元件',
        net_nt: 1_726_000_000,
        in_nt: 1_760_000_000,
        out_nt: 33_000_000,
        in_count: 2,
        out_count: 1,
        children: [
            {
                sector: '被動元件:電容器',
                net_nt: 1_726_000_000,
                in_nt: 1_760_000_000,
                out_nt: 33_000_000,
                in_count: 2,
                out_count: 1,
            },
        ],
    },
    {
        sector: '半導體',
        net_nt: -500_000_000,
        in_nt: 0,
        out_nt: 500_000_000,
        in_count: 0,
        out_count: 1,
        children: [],
    },
];

describe('SectorOverviewView', () => {
    it('lists parent themes ordered by net flow descending', () => {
        render(<SectorOverviewView bySector={sectors} />);
        expect(screen.getByText('被動元件')).toBeInTheDocument();
        expect(screen.getByText('半導體')).toBeInTheDocument();
    });

    it('renders net inflow in rose (red, up) and net outflow in emerald (green, down)', () => {
        render(<SectorOverviewView bySector={sectors} />);
        const up = screen.getByText(/\+17\.26 億/);
        expect(up.className).toMatch(/rose/);
        const down = screen.getByText(/-5\.00 億/);
        expect(down.className).toMatch(/emerald/);
    });

    it('shows the double-counting advisory note', () => {
        render(<SectorOverviewView bySector={sectors} />);
        expect(screen.getByText(/依題材歸類，個股可重複計入/)).toBeInTheDocument();
    });

    it('expands a parent theme to reveal child sub-themes, then collapses', () => {
        render(<SectorOverviewView bySector={sectors} />);
        // child hidden initially
        expect(screen.queryByText('被動元件:電容器')).not.toBeInTheDocument();
        // expand
        fireEvent.click(screen.getByText('被動元件'));
        expect(screen.getByText('被動元件:電容器')).toBeInTheDocument();
        // collapse
        fireEvent.click(screen.getByText('被動元件'));
        expect(screen.queryByText('被動元件:電容器')).not.toBeInTheDocument();
    });

    it('shows 無產業資料 message when bySector is null', () => {
        render(<SectorOverviewView bySector={null} />);
        expect(screen.getByText('無產業資料')).toBeInTheDocument();
    });

    it('shows 無產業資料 message when bySector is empty', () => {
        render(<SectorOverviewView bySector={[]} />);
        expect(screen.getByText('無產業資料')).toBeInTheDocument();
    });
});
