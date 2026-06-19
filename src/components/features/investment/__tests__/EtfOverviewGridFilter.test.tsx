/**
 * Tests for EtfOverviewGrid inactive-ETF filtering
 * (Requirement: Listing surfaces hide inactive ETFs).
 *
 * TDD: Written BEFORE implementation. An ETF stat with holdingsCount === 0 /
 * dataDate === null SHALL render no card; active ETFs still render.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EtfOverviewGrid } from '@/components/features/investment/EtfOverviewGrid';
import type { EtfOverviewStat } from '@/lib/investment/etfOverviewStats';

function makeStat(code: string, dataDate: string | null, holdingsCount: number): EtfOverviewStat {
    return {
        code,
        shortCode: code.slice(0, 5),
        name: `ETF ${code}`,
        manager: '測試投信',
        color: '#888888',
        dataDate,
        holdingsCount,
        nav: null,
        aum100m: null,
        added: 0,
        removed: 0,
        increased: 0,
        decreased: 0,
    };
}

describe('EtfOverviewGrid inactive filtering', () => {
    it('renders no card for an ETF with holdingsCount 0 / null dataDate', () => {
        render(
            <EtfOverviewGrid
                stats={[makeStat('00981', '2026-06-12', 30), makeStat('00998', null, 0)]}
            />,
        );

        expect(screen.queryByText('00998')).not.toBeInTheDocument();
    });

    it('still renders cards for active ETFs', () => {
        render(
            <EtfOverviewGrid
                stats={[makeStat('00981', '2026-06-12', 30), makeStat('00998', null, 0)]}
            />,
        );

        expect(screen.getByText('00981')).toBeInTheDocument();
    });

    it('renders nothing when every ETF is inactive', () => {
        const { container } = render(
            <EtfOverviewGrid stats={[makeStat('00998', null, 0), makeStat('00983', null, 0)]} />,
        );

        expect(container.querySelectorAll('a').length).toBe(0);
    });
});
