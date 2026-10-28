/**
 * Tests for EquityChartViewer (change: equity-ranking-chart-view, task 3.3).
 * BareKChart is mocked; we assert on the props it receives and on the viewer chrome.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EquityChartViewer } from '@/components/features/investment/equity/EquityChartViewer';
import type { BareKSnapshot } from '@/app/api/investment/bare-k/[code]/route';
import type { EquityRow } from '@/lib/investment/equityPageData';

const mockBareKChart = jest.fn();
jest.mock('@/components/features/investment/BareKChart', () => ({
    BareKChart: (props: Record<string, unknown>) => {
        mockBareKChart(props);
        return <div data-testid="bare-k-chart" />;
    },
}));

beforeAll(() => {
    class MockIntersectionObserver {
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
const SNAPSHOTS = new Map<string, BareKSnapshot | null>([
    ['2330', { stock_id: '2330' } as unknown as BareKSnapshot],
    ['2454', null],
]);

function renderViewer(props: Partial<React.ComponentProps<typeof EquityChartViewer>> = {}) {
    return render(
        <EquityChartViewer
            rows={ROWS}
            snapshots={SNAPSHOTS}
            etfMap={{ '2330': ['00981A', '00980A'] }}
            tier={null}
            backHref="/investment/equity?tier=200"
            listKey="big"
            {...props}
        />,
    );
}

describe('EquityChartViewer', () => {
    it('renders the chart with ETF codes as tags for a stock with a snapshot', () => {
        renderViewer();
        const props = mockBareKChart.mock.calls.at(-1)?.[0] as Record<string, unknown>;
        expect((props.snapshot as { stock_id: string }).stock_id).toBe('2330');
        expect(props.strategies).toEqual(['00981A', '00980A']);
    });

    it('shows the placeholder for a stock without a snapshot', () => {
        renderViewer();
        expect(screen.getByText('此股票尚未同步裸K資料，將於下次 Pipeline 執行後更新')).toBeInTheDocument();
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
});
