/**
 * Tests for EtfSelector activeCodes filtering
 * (Requirement: Listing surfaces hide inactive ETFs).
 *
 * TDD: Written BEFORE implementation.
 *   - activeCodes provided → only matching registry buttons render
 *   - activeCodes omitted → every registry button renders (unchanged behavior)
 *   - activeCodes = [] → no switcher buttons (empty is respected, not "show all")
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EtfSelector } from '@/components/features/investment/EtfSelector';
import { ETF_REGISTRY } from '@/lib/investment/etfRegistry';

describe('EtfSelector activeCodes filtering (drilldown)', () => {
    it('renders only buttons for active codes when activeCodes is provided', () => {
        const active = ETF_REGISTRY.filter(e => e.code !== '00998A').map(e => e.code);

        render(<EtfSelector currentEtf="00981A" mode="drilldown" activeCodes={active} />);

        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBe(active.length);
        // 00998A short code button must be absent
        expect(screen.queryByText(/00998/)).not.toBeInTheDocument();
    });

    it('renders every registry button when activeCodes is omitted', () => {
        render(<EtfSelector currentEtf="00981A" mode="drilldown" />);

        expect(screen.getAllByRole('button').length).toBe(ETF_REGISTRY.length);
    });

    it('renders no buttons when activeCodes is an empty array', () => {
        render(<EtfSelector currentEtf="00981A" mode="drilldown" activeCodes={[]} />);

        expect(screen.queryAllByRole('button').length).toBe(0);
    });
});
