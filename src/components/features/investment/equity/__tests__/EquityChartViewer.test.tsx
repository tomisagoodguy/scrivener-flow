/**
 * Tests for EquityChartViewer (change: equity-ranking-chart-view, task 3.3;
 * on-demand snapshot loading and jump-dot threshold from change: equity-chart-top-100, task 1.2).
 * BareKChart and getStrategySnapshots are mocked; we assert on the props BareKChart receives and on the viewer chrome.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { EquityChartViewer } from '@/components/features/investment/equity/EquityChartViewer';
import { getStrategySnapshots } from '@/app/actions/getStrategySnapshots';
import type { BareKSnapshot } from '@/app/api/investment/bare-k/[code]/route';
import type { EquityRow } from '@/lib/investment/equityPageData';

jest.mock('@/app/actions/getStrategySnapshots', () => ({
    getStrategySnapshots: jest.fn(),
}));

const mockBareKChart = jest.fn();
jest.mock('@/components/features/investment/BareKChart', () => ({
    BareKChart: (props: Record<string, unknown>) => {
        mockBareKChart(props);
        return <div data-testid="bare-k-chart" />;
    },
}));

const mockGet = getStrategySnapshots as jest.MockedFunction<typeof getStrategySnapshots>;

// 記錄每個 observer 與其觀察的元素，供測試手動觸發「進入視窗」
const observers: { cb: IntersectionObserverCallback; els: Element[] }[] = [];
beforeAll(() => {
    class MockIntersectionObserver {
        private entry: { cb: IntersectionObserverCallback; els: Element[] };
        constructor(cb: IntersectionObserverCallback) {
            this.entry = { cb, els: [] };
            observers.push(this.entry);
        }
        observe(el: Element) {
            this.entry.els.push(el);
        }
        disconnect() {
            this.entry.els = [];
        }
    }
    Object.defineProperty(window, 'IntersectionObserver', { writable: true, value: MockIntersectionObserver });
    Element.prototype.scrollIntoView = jest.fn();
    window.scrollTo = jest.fn();
});

beforeEach(() => {
    jest.useFakeTimers();
    observers.length = 0;
    mockBareKChart.mockClear();
    mockGet.mockReset();
});
afterEach(() => jest.useRealTimers());

/** 所有被觀察元素同時進入視窗並停留 ms 毫秒，再讓快照 Promise 完成 */
async function dwellAll(ms = 300) {
    act(() => {
        for (const { cb, els } of observers) {
            if (els.length === 0) continue;
            cb(
                els.map((target) => ({ isIntersecting: true, target }) as unknown as IntersectionObserverEntry),
                {} as IntersectionObserver,
            );
        }
    });
    await act(async () => {
        jest.advanceTimersByTime(ms);
    });
}

function row(code: string, name: string, overrides: Partial<EquityRow> = {}): EquityRow {
    return {
        stock_code: code,
        stock_name: name,
        total_shareholders: null,
        shareholders_change_rate: null,
        big_holder_pct_change: null,
        mid_holder_pct_change: null,
        whale_holder_pct_change: null,
        ...overrides,
    };
}

const ROWS = [
    row('2330', '台積電', { big_holder_pct_change: 0.85, shareholders_change_rate: -2.3 }),
    row('2454', '聯發科'),
];
const SNAPSHOTS: Record<string, BareKSnapshot | null> = {
    '2330': { stock_id: '2330' } as unknown as BareKSnapshot,
    '2454': null,
};

function mockSnapshots() {
    mockGet.mockImplementation(async (ids: string[]) => new Map(ids.map((id) => [id, SNAPSHOTS[id] ?? null])));
}

function renderViewer(props: Partial<React.ComponentProps<typeof EquityChartViewer>> = {}) {
    return render(
        <EquityChartViewer
            rows={ROWS}
            etfMap={{ '2330': ['00981A', '00980A'] }}
            tier={null}
            backHref="/investment/equity?tier=200"
            listKey="big"
            {...props}
        />,
    );
}

function manyRows(n: number): EquityRow[] {
    return Array.from({ length: n }, (_, i) => row(String(1000 + i), `股票${i}`));
}

describe('EquityChartViewer', () => {
    it('shows loading skeletons and requests no snapshot before sections dwell in view', () => {
        renderViewer();
        expect(screen.getAllByTestId('lazy-bare-k-loading')).toHaveLength(2);
        expect(mockGet).not.toHaveBeenCalled();
        expect(mockBareKChart).not.toHaveBeenCalled();
    });

    it('does not request a snapshot when a section leaves view before 300ms', async () => {
        mockSnapshots();
        renderViewer();
        await dwellAll(299);
        expect(mockGet).not.toHaveBeenCalled();
    });

    it('renders the chart with ETF codes as tags for a stock with a snapshot after dwelling', async () => {
        mockSnapshots();
        renderViewer();
        await dwellAll();
        expect(mockGet).toHaveBeenCalledWith(['2330']);
        const props = mockBareKChart.mock.calls.at(-1)?.[0] as Record<string, unknown>;
        expect((props.snapshot as { stock_id: string }).stock_id).toBe('2330');
        expect(props.strategies).toEqual(['00981A', '00980A']);
    });

    it('shows the placeholder for a stock without a snapshot', async () => {
        mockSnapshots();
        renderViewer();
        await dwellAll();
        expect(screen.getByText('此股票尚未同步裸K資料，將於下次 Pipeline 執行後更新')).toBeInTheDocument();
    });

    it('shows the failure message only in the section whose request failed', async () => {
        mockGet.mockImplementation(async (ids: string[]) => {
            if (ids[0] === '2454') throw new Error('network');
            return new Map(ids.map((id) => [id, SNAPSHOTS[id] ?? null]));
        });
        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
        renderViewer();
        await dwellAll();
        expect(screen.getAllByText('圖表載入失敗')).toHaveLength(1);
        expect(screen.getAllByTestId('bare-k-chart')).toHaveLength(1);
        spy.mockRestore();
    });

    it('appends chip context to the section header', () => {
        renderViewer();
        expect(screen.getByText('400張+大戶 +0.85pp・股東 -2.30%')).toBeInTheDocument();
        expect(screen.getAllByText('台積電').length).toBeGreaterThan(0);
    });

    it('uses the given back link', () => {
        renderViewer();
        expect(screen.getByRole('link', { name: /返回/ })).toHaveAttribute('href', '/investment/equity?tier=200');
    });

    it('shows the empty message and no viewer for an empty list', () => {
        renderViewer({ rows: [] });
        expect(screen.getByText('此清單目前沒有股票')).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /返回/ })).not.toBeInTheDocument();
        expect(mockBareKChart).not.toHaveBeenCalled();
    });

    it.each([
        [7, true],
        [30, true],
        [31, false],
        [100, false],
    ])('with %i rows, jump dots shown = %p', (n, shown) => {
        renderViewer({ rows: manyRows(n) });
        const nav = screen.queryByRole('navigation', { name: '快速跳轉' });
        if (shown) expect(nav).toBeInTheDocument();
        else expect(nav).not.toBeInTheDocument();
    });
});
