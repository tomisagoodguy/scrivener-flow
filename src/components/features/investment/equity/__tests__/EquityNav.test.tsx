/**
 * Tests for equity ranking nav links (change: equity-ranking-chart-view, tasks 3.1 / 3.2).
 * Asserts href query params so chart view state survives tier / weeks / view switches.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TierNav } from '@/components/features/investment/equity/TierNav';
import { WeekNav } from '@/components/features/investment/equity/WeekNav';
import { EquityViewNav } from '@/components/features/investment/equity/EquityViewNav';
import { parseEquityChartList } from '@/lib/investment/equityChartUtils';

function params(linkText: string): URLSearchParams {
    const href = screen.getByRole('link', { name: linkText }).getAttribute('href') ?? '';
    return new URLSearchParams(href.split('?')[1] ?? '');
}

describe('TierNav extraParams', () => {
    it('keeps view and list in chart view', () => {
        render(<TierNav tier={null} weeks={1} extraParams={{ view: 'chart', list: 'retail' }} />);
        const p = params('1000張+');
        expect(p.get('view')).toBe('chart');
        expect(p.get('list')).toBe('retail');
        expect(p.get('tier')).toBe('1000');
    });

    it('produces the same hrefs as before without extraParams', () => {
        render(<TierNav tier={null} weeks={2} />);
        expect(screen.getByRole('link', { name: '1000張+' }).getAttribute('href')).toBe('?tier=1000&weeks=2');
        expect(screen.getByRole('link', { name: '預設' }).getAttribute('href')).toBe('?weeks=2');
    });
});

describe('EquityViewNav', () => {
    const counts = { double: 7, big: 30, retail: 12 };

    it('chart link carries tier and weeks', () => {
        render(<EquityViewNav isChart={false} list="double" baseParams={{ tier: '400', weeks: '2' }} counts={counts} />);
        const p = params('圖表');
        expect(p.get('view')).toBe('chart');
        expect(p.get('tier')).toBe('400');
        expect(p.get('weeks')).toBe('2');
        expect(screen.getByRole('link', { name: '排行' })).toHaveAttribute('aria-current', 'page');
    });

    it('table view hides list links', () => {
        render(<EquityViewNav isChart={false} list="double" baseParams={{}} counts={counts} />);
        expect(screen.getByRole('link', { name: '排行' }).getAttribute('href')).toBe('/investment/equity');
        expect(screen.queryByRole('link', { name: /雙訊號/ })).toBeNull();
    });

    it('chart view shows list links with counts and highlights the parsed list', () => {
        render(<EquityViewNav isChart list={parseEquityChartList('foo')} baseParams={{ tier: '200' }} counts={counts} />);
        expect(screen.getByRole('link', { name: '圖表' })).toHaveAttribute('aria-current', 'page');
        expect(screen.getByRole('link', { name: '雙訊號（7）' })).toHaveAttribute('aria-current', 'page');
        expect(screen.getByRole('link', { name: '主力買進（30）' })).not.toHaveAttribute('aria-current');
        const p = params('散戶減少（12）');
        expect(p.get('view')).toBe('chart');
        expect(p.get('list')).toBe('retail');
        expect(p.get('tier')).toBe('200');
    });
});

describe('WeekNav extraParams', () => {
    it('keeps view and list in chart view', () => {
        render(<WeekNav weeks={1} tier="400" extraParams={{ view: 'chart', list: 'big' }} />);
        const p = params('3週');
        expect(p.get('view')).toBe('chart');
        expect(p.get('list')).toBe('big');
        expect(p.get('tier')).toBe('400');
        expect(p.get('weeks')).toBe('3');
    });

    it('produces the same hrefs as before without extraParams', () => {
        render(<WeekNav weeks={2} tier={null} />);
        expect(screen.getByRole('link', { name: '1週' }).getAttribute('href')).toBe('?');
        expect(screen.getByRole('link', { name: '3週' }).getAttribute('href')).toBe('?weeks=3');
    });
});
