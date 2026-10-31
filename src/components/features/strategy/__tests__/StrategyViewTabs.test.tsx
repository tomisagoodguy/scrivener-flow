/**
 * Tests for StrategyViewTabs (change: strategy-trades-view-tab, task 1.2).
 * Covers "Trades view tab in strategy page toggle": tab order, links, highlight.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import StrategyViewTabs from '@/components/features/strategy/StrategyViewTabs';
import type { StrategyView } from '@/lib/investment/strategyUtils';

const EXPECTED_TABS: Array<[string, string]> = [
    ['策略視角', '/investment/strategy'],
    ['監控清單', '/investment/strategy?view=monitor'],
    ['圖表', '/investment/strategy?view=chart'],
    ['均線發散候選', '/investment/strategy/fan-breakout'],
    ['換股後表現', '/investment/strategy?view=trades'],
];

const ACTIVE_CLASS = 'shadow-sm';

function highlightedLabels(): string[] {
    return screen
        .getAllByRole('link')
        .filter((a) => a.className.split(/\s+/).includes(ACTIVE_CLASS))
        .map((a) => a.textContent ?? '');
}

describe('StrategyViewTabs', () => {
    it('renders five tabs in order with their links', () => {
        render(<StrategyViewTabs active="strategy" />);
        const links = screen.getAllByRole('link');
        expect(links.map((a) => [a.textContent, a.getAttribute('href')])).toEqual(EXPECTED_TABS);
    });

    it.each<[StrategyView, string]>([
        ['strategy', '策略視角'],
        ['monitor', '監控清單'],
        ['chart', '圖表'],
        ['trades', '換股後表現'],
    ])('active=%s highlights only %s', (active, label) => {
        render(<StrategyViewTabs active={active} />);
        expect(highlightedLabels()).toEqual([label]);
    });

    it('never highlights 均線發散候選', () => {
        for (const active of ['strategy', 'monitor', 'chart', 'trades'] as const) {
            const { unmount } = render(<StrategyViewTabs active={active} />);
            expect(highlightedLabels()).not.toContain('均線發散候選');
            unmount();
        }
    });
});
