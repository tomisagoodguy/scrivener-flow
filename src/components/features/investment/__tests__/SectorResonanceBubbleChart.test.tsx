/**
 * Tests for SectorResonanceBubbleChart.
 *
 * TDD: Written BEFORE implementation. Covers:
 *   "Clicking a bubble shows category detail"
 *     - click reveals stock_codes and etf_codes
 *   "Bubble chart renders force-directed collision layout" (smoke check)
 *     - one <circle> rendered per category
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SectorResonanceBubbleChart } from '@/components/features/investment/SectorResonanceBubbleChart';
import type { EtfSectorActivityMap } from '@/lib/investment/etfSectorActivityUtils';

const activity: EtfSectorActivityMap = {
    'AI 伺服器': {
        etf_codes: ['00981A', '00982A'],
        stock_codes: ['2330', '2454'],
        stock_etf_map: { '2330': ['00981A', '00982A'], '2454': ['00981A'] },
    },
    '傳產': {
        etf_codes: ['00981A'],
        stock_codes: ['1301'],
        stock_etf_map: { '1301': ['00981A'] },
    },
};

describe('SectorResonanceBubbleChart', () => {
    it('renders one bubble per category', () => {
        const { container } = render(<SectorResonanceBubbleChart etfActivity={activity} />);
        const circles = container.querySelectorAll('circle');
        expect(circles.length).toBe(2);
    });

    it('reveals stock codes and etf codes when a bubble is clicked', () => {
        render(<SectorResonanceBubbleChart etfActivity={activity} />);

        fireEvent.click(screen.getByTestId('resonance-bubble-AI 伺服器'));

        expect(screen.getByText(/2330/)).toBeInTheDocument();
        expect(screen.getByText(/2454/)).toBeInTheDocument();
        expect(screen.getByText(/00981A/)).toBeInTheDocument();
        expect(screen.getByText(/00982A/)).toBeInTheDocument();
    });

    it('renders nothing when the activity map is empty', () => {
        const { container } = render(<SectorResonanceBubbleChart etfActivity={{}} />);
        expect(container.querySelectorAll('circle').length).toBe(0);
    });
});
