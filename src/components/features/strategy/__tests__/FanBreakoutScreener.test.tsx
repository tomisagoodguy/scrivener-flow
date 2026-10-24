/**
 * Tests for FanBreakoutScreener (openspec: fan-breakout-screener, task 5.2).
 * StockChart / usePriceData / ThemeProvider are mocked; we assert on what the
 * screener passes to them.
 */

import React from 'react';
import { act, render, screen, fireEvent, within } from '@testing-library/react';
import FanBreakoutScreener from '@/components/features/strategy/FanBreakoutScreener';
import type { FanBreakoutResult, FanBreakoutRow } from '@/lib/investment/fanBreakout';

const mockStockChart = jest.fn();
jest.mock('@/components/features/investment/StockChart', () => ({
    StockChart: (props: Record<string, unknown>) => {
        mockStockChart(props);
        return <div data-testid="stock-chart" />;
    },
}));

const mockUsePriceData = jest.fn();
jest.mock('@/hooks/investment/usePriceData', () => ({
    usePriceData: (code: string | null) => mockUsePriceData(code),
}));

jest.mock('@/components/providers/ThemeProvider', () => ({
    useTheme: () => ({ theme: 'light' }),
}));

function makeRow(i: number, overrides: Partial<FanBreakoutRow> = {}): FanBreakoutRow {
    const day = String(28 - Math.floor(i / 5)).padStart(2, '0');
    return {
        date: `2026-10-${day}`,
        stockId: String(1000 + i),
        name: `測試${i}`,
        score: 0.2 - i * 0.001,
        signalType: 'repeat',
        consecDays: 1,
        spread: 0.1234,
        market: '上市',
        recentSignalDates: [`2026-10-${day}`],
        signalClose: 100,
        latestClose: 110,
        latestDate: '2026-10-28',
        returnSinceSignal: 0.1,
        highSinceSignal: 120,
        lowSinceSignal: 95,
        ...overrides,
    };
}

function makeResult(rows: FanBreakoutRow[], error?: string): FanBreakoutResult {
    return { rows, latestDate: rows[0]?.date ?? null, ...(error ? { error } : {}) };
}

function bodyRows(): HTMLElement[] {
    return within(screen.getByRole('table')).getAllByRole('row').slice(1);
}

function selectedStock(): string {
    return mockUsePriceData.mock.calls[mockUsePriceData.mock.calls.length - 1][0] as string;
}

beforeEach(() => {
    mockStockChart.mockClear();
    mockUsePriceData.mockReset();
    mockUsePriceData.mockReturnValue({ data: [], loading: false, error: null, refetch: jest.fn() });
});

describe('FanBreakoutScreener states', () => {
    it('shows empty state without error when rows are empty', () => {
        render(<FanBreakoutScreener result={makeResult([])} />);
        expect(screen.getByText(/近 30 天無均線發散候選/)).toBeInTheDocument();
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('shows error and not the empty state when error is set', () => {
        render(<FanBreakoutScreener result={makeResult([], '查詢失敗 XYZ')} />);
        expect(screen.getByRole('alert')).toHaveTextContent('查詢失敗 XYZ');
        expect(screen.queryByText(/近 30 天無均線發散候選/)).not.toBeInTheDocument();
    });

    it('shows disclaimers', () => {
        render(<FanBreakoutScreener result={makeResult([makeRow(0)])} />);
        expect(screen.getByText(/候選清單，非投資建議/)).toBeInTheDocument();
        expect(screen.getByText(/訊號以還原價計算/)).toBeInTheDocument();
        expect(screen.getByText(/以收盤價計，未還原/)).toBeInTheDocument();
    });
});

describe('FanBreakoutScreener filters', () => {
    it('filters by first signal and 上櫃', () => {
        const rows = [
            makeRow(0, { signalType: 'first', market: '上櫃' }),
            makeRow(1, { signalType: 'first', market: '上市' }),
            makeRow(2, { signalType: 'repeat', market: '上櫃' }),
        ];
        render(<FanBreakoutScreener result={makeResult(rows)} />);
        fireEvent.change(screen.getByLabelText('類型'), { target: { value: 'first' } });
        fireEvent.change(screen.getByLabelText('市場'), { target: { value: '上櫃' } });
        const shown = bodyRows();
        expect(shown).toHaveLength(1);
        expect(shown[0]).toHaveTextContent('1000');
    });

    it('filters by minimum consecutive days 3', () => {
        const rows = [
            makeRow(0, { consecDays: 1 }),
            makeRow(1, { consecDays: 3 }),
            makeRow(2, { consecDays: 5 }),
        ];
        render(<FanBreakoutScreener result={makeResult(rows)} />);
        fireEvent.change(screen.getByLabelText('最少連續天數'), { target: { value: '3' } });
        expect(bodyRows()).toHaveLength(2);
    });

    it('paginates 20 per page (45 rows -> 3 pages) and resets to page 1 on filter change', () => {
        const rows = Array.from({ length: 45 }, (_, i) => makeRow(i));
        render(<FanBreakoutScreener result={makeResult(rows)} />);
        expect(bodyRows()).toHaveLength(20);
        expect(screen.getByText('第 1 / 3 頁')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: '下一頁' }));
        fireEvent.click(screen.getByRole('button', { name: '下一頁' }));
        expect(screen.getByText('第 3 / 3 頁')).toBeInTheDocument();
        expect(bodyRows()).toHaveLength(5);
        fireEvent.change(screen.getByLabelText('市場'), { target: { value: '上市' } });
        expect(screen.getByText('第 1 / 3 頁')).toBeInTheDocument();
    });
});

describe('FanBreakoutScreener navigation', () => {
    const rows = Array.from({ length: 45 }, (_, i) => makeRow(i));

    it('selects the first row by default and next moves selection', () => {
        render(<FanBreakoutScreener result={makeResult(rows)} />);
        expect(selectedStock()).toBe('1000');
        fireEvent.click(screen.getByRole('button', { name: '下一檔' }));
        expect(selectedStock()).toBe('1001');
    });

    it('next across the page boundary switches to page 2', () => {
        render(<FanBreakoutScreener result={makeResult(rows)} />);
        fireEvent.click(bodyRows()[19]);
        expect(selectedStock()).toBe('1019');
        fireEvent.click(screen.getByRole('button', { name: '下一檔' }));
        expect(selectedStock()).toBe('1020');
        expect(screen.getByText('第 2 / 3 頁')).toBeInTheDocument();
        expect(bodyRows()[0]).toHaveTextContent('1020');
    });

    it('arrow keys navigate when focus is on the body', () => {
        render(<FanBreakoutScreener result={makeResult(rows)} />);
        fireEvent.keyDown(document.body, { key: 'ArrowRight' });
        expect(selectedStock()).toBe('1001');
        fireEvent.keyDown(document.body, { key: 'ArrowLeft' });
        expect(selectedStock()).toBe('1000');
    });

    it('arrow keys do nothing when focus is in an input', () => {
        render(<FanBreakoutScreener result={makeResult(rows)} />);
        const input = screen.getByLabelText('最少連續天數');
        input.focus();
        fireEvent.keyDown(input, { key: 'ArrowRight' });
        expect(selectedStock()).toBe('1000');
    });
});

describe('FanBreakoutScreener cells and chart', () => {
    it('uses rose for positive, emerald for negative returns and — for null', () => {
        const rows = [
            makeRow(0, { returnSinceSignal: 0.12 }),
            makeRow(1, { returnSinceSignal: -0.03 }),
            makeRow(2, {
                returnSinceSignal: null,
                highSinceSignal: null,
                lowSinceSignal: null,
                signalClose: null,
            }),
        ];
        render(<FanBreakoutScreener result={makeResult(rows)} />);
        const [r0, r1, r2] = bodyRows();
        expect(within(r0).getByText('+12.00%').className).toContain('text-rose-600');
        expect(within(r1).getByText('-3.00%').className).toContain('text-emerald-600');
        expect(within(r2).getAllByText('—').length).toBeGreaterThanOrEqual(3);
    });

    it('passes maPeriods and markers from recentSignalDates to StockChart', () => {
        mockUsePriceData.mockReturnValue({
            data: [{ time: '2026-10-22', open: 1, high: 1, low: 1, close: 1, value: 1 }],
            loading: false,
            error: null,
            refetch: jest.fn(),
        });
        const rows = [makeRow(0, { recentSignalDates: ['2026-09-30', '2026-10-22'] })];
        render(<FanBreakoutScreener result={makeResult(rows)} />);
        expect(screen.getByTestId('stock-chart')).toBeInTheDocument();
        const props = mockStockChart.mock.calls[mockStockChart.mock.calls.length - 1][0] as {
            maPeriods: number[];
            markers: { time: string }[];
        };
        expect(props.maPeriods).toEqual([5, 10, 20, 60, 120]);
        expect(props.markers.map((m) => m.time)).toEqual(['2026-09-30', '2026-10-22']);
    });
});

// ── 連續看圖（openspec: fan-breakout-chart-crossref, tasks 3.2–3.3） ──

type ObserverCallback = (entries: Array<{ isIntersecting: boolean; target: Element }>) => void;
let observerCallback: ObserverCallback | null = null;

function activateSection(idx: number) {
    const header = document.querySelector(`[data-idx="${idx}"]`);
    if (!header || !observerCallback) throw new Error('observer not ready');
    act(() => observerCallback?.([{ isIntersecting: true, target: header }]));
}

function switchToContinuous() {
    fireEvent.click(screen.getByRole('button', { name: '連續看圖' }));
}

describe('FanBreakoutScreener continuous view', () => {
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

    const rows = [makeRow(0), makeRow(1), makeRow(2)];

    it('defaults to table mode', () => {
        render(<FanBreakoutScreener result={makeResult(rows)} />);
        expect(screen.getByRole('button', { name: '表格' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('hides table, pagination and single panel but keeps filters in continuous mode', () => {
        render(<FanBreakoutScreener result={makeResult(rows)} />);
        switchToContinuous();
        expect(screen.getByRole('button', { name: '連續看圖' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '下一頁' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '下一檔' })).not.toBeInTheDocument();
        expect(screen.getByLabelText('類型')).toBeInTheDocument();
        expect(screen.getByText('1 / 3')).toBeInTheDocument();
    });

    it('returns to table via 返回表格 and keeps filters', () => {
        const filtered = [makeRow(0, { signalType: 'first' }), makeRow(1), makeRow(2)];
        render(<FanBreakoutScreener result={makeResult(filtered)} />);
        fireEvent.change(screen.getByLabelText('類型'), { target: { value: 'first' } });
        switchToContinuous();
        fireEvent.click(screen.getByRole('button', { name: /返回表格/ }));
        expect(screen.getByRole('table')).toBeInTheDocument();
        expect(screen.getByLabelText('類型')).toHaveValue('first');
        expect(bodyRows()).toHaveLength(1);
    });

    it('arrow keys do not change the table selection in continuous mode', () => {
        render(<FanBreakoutScreener result={makeResult(rows)} />);
        switchToContinuous();
        fireEvent.keyDown(document.body, { key: 'ArrowRight' });
        fireEvent.click(screen.getByRole('button', { name: /返回表格/ }));
        expect(selectedStock()).toBe('1000');
    });

    it('starts at the stock selected in the table', () => {
        render(<FanBreakoutScreener result={makeResult(rows)} />);
        fireEvent.click(bodyRows()[1]);
        switchToContinuous();
        expect(screen.getByText('2 / 3')).toBeInTheDocument();
    });

    it('lists each stock once using its newest signal row', () => {
        const dup = [
            makeRow(0, { stockId: '2330', date: '2026-10-23' }),
            makeRow(1, { stockId: '2454', date: '2026-10-23' }),
            makeRow(2, { stockId: '2330', date: '2026-10-20' }),
        ];
        render(<FanBreakoutScreener result={makeResult(dup)} />);
        switchToContinuous();
        expect(screen.getByText('1 / 2')).toBeInTheDocument();
    });

    it.each([
        [0.052, '+5.2%', 'text-rose-600'],
        [-0.031, '-3.1%', 'text-emerald-600'],
        [0, '0.0%', 'text-gray-500'],
        [null, '—', 'text-gray-500'],
    ])('formats return since signal %p as %s', (value, text, cls) => {
        const one = [makeRow(0, { spread: 0.1234, signalType: 'first', consecDays: 3, returnSinceSignal: value })];
        render(<FanBreakoutScreener result={makeResult(one)} />);
        switchToContinuous();
        const header = document.querySelector('[data-idx="0"]') as HTMLElement;
        expect(within(header).getByText(text).className).toContain(cls);
        expect(within(header).getByText('+12.3%')).toBeInTheDocument();
        expect(within(header).getByText('首次')).toBeInTheDocument();
        expect(within(header).getByText('連續 3 天')).toBeInTheDocument();
    });

    it('remounts at the first stock when a filter changes', () => {
        const many = Array.from({ length: 5 }, (_, i) => makeRow(i, { market: i < 4 ? '上市' : '上櫃' }));
        render(<FanBreakoutScreener result={makeResult(many)} />);
        switchToContinuous();
        activateSection(2);
        expect(screen.getByText('3 / 5')).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('市場'), { target: { value: '上市' } });
        expect(screen.getByText('1 / 4')).toBeInTheDocument();
    });

    it('shows the no-match message and no viewer when filters leave zero rows', () => {
        render(<FanBreakoutScreener result={makeResult(rows)} />);
        switchToContinuous();
        fireEvent.change(screen.getByLabelText('市場'), { target: { value: '上櫃' } });
        expect(screen.getByText('沒有符合篩選條件的候選。')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /返回表格/ })).not.toBeInTheDocument();
    });
});
