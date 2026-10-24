/**
 * Tests for StrategyChartViewer (openspec: fan-breakout-chart-crossref, task 4.2).
 * BareKChart is mocked; we assert on the props it receives and on the viewer chrome.
 */

import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { StrategyChartViewer } from '@/components/features/strategy/StrategyChartViewer';
import type { StrategyMonitorStock } from '@/components/features/strategy/StrategyMonitorCard';
import type { BareKSnapshot } from '@/app/api/investment/bare-k/[code]/route';
import type { FanBreakoutRow } from '@/lib/investment/fanBreakout';

const mockBareKChart = jest.fn();
jest.mock('@/components/features/investment/BareKChart', () => ({
    BareKChart: (props: Record<string, unknown>) => {
        mockBareKChart(props);
        return <div data-testid="bare-k-chart" />;
    },
}));

type ObserverCallback = (entries: Array<{ isIntersecting: boolean; target: Element }>) => void;
let observerCallback: ObserverCallback | null = null;

beforeAll(() => {
    class MockIntersectionObserver {
        constructor(cb: ObserverCallback) {
            observerCallback = cb;
        }
        observe() {}
        disconnect() {}
    }
    Object.defineProperty(window, 'IntersectionObserver', { writable: true, value: MockIntersectionObserver });
    Element.prototype.scrollIntoView = jest.fn();
    window.scrollTo = jest.fn();
});

beforeEach(() => {
    mockBareKChart.mockClear();
});

function activate(idx: number) {
    const header = document.querySelector(`[data-idx="${idx}"]`);
    if (!header || !observerCallback) throw new Error('observer not ready');
    act(() => observerCallback?.([{ isIntersecting: true, target: header }]));
}

function stock(id: string, strategies: string[]): StrategyMonitorStock {
    return {
        stock_id: id,
        name: `名稱${id}`,
        ret_1d: null,
        ret_5d: null,
        ret_20d: null,
        category: '其他',
        strategies,
        movement: 'none',
        etfHolders: [],
    };
}

function fanRow(stockId: string, overrides: Partial<FanBreakoutRow> = {}): FanBreakoutRow {
    return {
        date: '2026-10-23',
        stockId,
        name: `名稱${stockId}`,
        score: 0.1,
        signalType: 'first',
        consecDays: 1,
        spread: 0.1,
        market: '上市',
        recentSignalDates: ['2026-10-23'],
        signalClose: 100,
        latestClose: 100,
        latestDate: '2026-10-23',
        returnSinceSignal: 0,
        highSinceSignal: 100,
        lowSinceSignal: 100,
        ...overrides,
    };
}

const STOCKS = [
    stock('2330', ['trend_template', 'fan_breakout']),
    stock('2454', ['fan_breakout']),
    stock('3017', ['trend_template']),
];
const LABELS = { trend_template: '趨勢樣板選股', fan_breakout: '均線發散突破' };
const FAN = { '2330': fanRow('2330', { signalType: 'first' }), '2454': fanRow('2454', { signalType: 'repeat' }) };
const SNAPSHOTS = new Map<string, BareKSnapshot | null>(
    STOCKS.map((s) => [s.stock_id, { stock_id: s.stock_id } as unknown as BareKSnapshot]),
);

function renderViewer(props: Partial<React.ComponentProps<typeof StrategyChartViewer>> = {}) {
    return render(
        <StrategyChartViewer
            stocks={STOCKS}
            snapshots={SNAPSHOTS}
            strategyLabels={LABELS}
            fanBreakoutByStock={FAN}
            {...props}
        />,
    );
}

function lastChartPropsFor(stockId: string): Record<string, unknown> {
    const calls = mockBareKChart.mock.calls.filter(([p]) => (p.snapshot as { stock_id: string }).stock_id === stockId);
    return calls[calls.length - 1][0] as Record<string, unknown>;
}

describe('StrategyChartViewer filter bar', () => {
    it('lists only present strategies with Chinese labels and counts', () => {
        renderViewer();
        const options = within(screen.getByLabelText('策略')).getAllByRole('option').map((o) => o.textContent);
        expect(options).toEqual(['全部策略', '趨勢樣板選股（2）', '均線發散突破（2）']);
    });

    it('filters by a single strategy', () => {
        renderViewer();
        fireEvent.change(screen.getByLabelText('策略'), { target: { value: 'fan_breakout' } });
        expect(screen.getByText('1 / 2')).toBeInTheDocument();
        expect(screen.queryByText('3017')).not.toBeInTheDocument();
    });

    it('filters by fan-breakout signal type and excludes non-candidates', () => {
        renderViewer();
        fireEvent.change(screen.getByLabelText('均線發散'), { target: { value: 'first' } });
        expect(screen.getByText('1 / 1')).toBeInTheDocument();
        expect(screen.queryByText('2454')).not.toBeInTheDocument();
        expect(screen.queryByText('3017')).not.toBeInTheDocument();
    });

    it('shows the no-match message and no viewer when nothing matches', () => {
        renderViewer();
        fireEvent.change(screen.getByLabelText('策略'), { target: { value: 'trend_template' } });
        fireEvent.change(screen.getByLabelText('均線發散'), { target: { value: 'repeat' } });
        expect(screen.getByText('沒有符合篩選條件的股票')).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /返回/ })).not.toBeInTheDocument();
    });

    it('remounts at the first matching stock when a filter changes', () => {
        renderViewer();
        activate(2);
        expect(screen.getByText('3 / 3')).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('策略'), { target: { value: 'trend_template' } });
        expect(screen.getByText('1 / 2')).toBeInTheDocument();
    });
});

describe('StrategyChartViewer chart context', () => {
    it('passes Chinese strategy labels and falls back to raw id', () => {
        renderViewer({ stocks: [stock('2330', ['fan_breakout', 'mystery'])] });
        expect(lastChartPropsFor('2330').strategies).toEqual(['均線發散突破', 'mystery']);
    });

    it('shows fan-breakout header context and passes markerDates', () => {
        const dates = ['2026-10-17', '2026-10-22', '2026-10-23'];
        renderViewer({
            fanBreakoutByStock: {
                '2330': fanRow('2330', { spread: 0.0871, signalType: 'repeat', consecDays: 4, recentSignalDates: dates }),
            },
        });
        expect(screen.getByText('發散 +8.7%・再次・連續 4 天')).toBeInTheDocument();
        expect(lastChartPropsFor('2330').markerDates).toEqual(dates);
        expect(lastChartPropsFor('2454').markerDates).toBeUndefined();
    });

    it('renders without fan context when no candidates are given', () => {
        renderViewer({ fanBreakoutByStock: {} });
        expect(screen.queryByText(/^發散/)).not.toBeInTheDocument();
        expect(lastChartPropsFor('2330').markerDates).toBeUndefined();
    });

    it('keeps the back link to /investment/strategy and does not sync the URL', () => {
        const spy = jest.spyOn(window.history, 'replaceState').mockImplementation(() => undefined);
        renderViewer();
        activate(1);
        expect(spy).not.toHaveBeenCalled();
        expect(screen.getByRole('link', { name: /返回/ })).toHaveAttribute('href', '/investment/strategy');
        spy.mockRestore();
    });
});
