/**
 * Tests for StockChart optional moving averages and markers
 * (openspec: fan-breakout-screener, task 5.1).
 *
 * TDD: written BEFORE implementation. lightweight-charts needs a real canvas,
 * so the module is mocked and we assert on the calls StockChart makes.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { createChart, createSeriesMarkers, LineSeries } from 'lightweight-charts';
import { StockChart } from '@/components/features/investment/StockChart';
import type { ChartMarker, PriceData } from '@/lib/investment/indicators';

// virtual: lightweight-charts 5.x 的 exports 只有 `import` 條件（純 ESM），Jest(CJS) 無法 resolve 真實模組
jest.mock('lightweight-charts', () => {
    const makeSeries = () => ({
        setData: jest.fn(),
        priceScale: jest.fn(() => ({ applyOptions: jest.fn() })),
    });
    const makeChart = () => ({
        addSeries: jest.fn(() => makeSeries()),
        removeSeries: jest.fn(),
        applyOptions: jest.fn(),
        remove: jest.fn(),
        timeScale: jest.fn(() => ({ fitContent: jest.fn() })),
    });
    return {
        ColorType: { Solid: 'solid' },
        CandlestickSeries: { kind: 'Candlestick' },
        HistogramSeries: { kind: 'Histogram' },
        LineSeries: { kind: 'Line' },
        createChart: jest.fn(() => makeChart()),
        createSeriesMarkers: jest.fn(() => ({ setMarkers: jest.fn(), detach: jest.fn() })),
    };
}, { virtual: true });

interface MockSeries {
    setData: jest.Mock;
}
interface MockChart {
    addSeries: jest.Mock;
    removeSeries: jest.Mock;
    remove: jest.Mock;
}
interface MockMarkersApi {
    setMarkers: jest.Mock;
}

const createChartMock = createChart as unknown as jest.Mock;
const createSeriesMarkersMock = createSeriesMarkers as unknown as jest.Mock;

/** 產生 count 根連續日 K（日期遞增，收盤價 100 + i，足以算出 MA120） */
function makeBars(count: number): PriceData[] {
    const start = Date.UTC(2026, 0, 1);
    return Array.from({ length: count }, (_, i) => {
        const time = new Date(start + i * 86_400_000).toISOString().slice(0, 10);
        const close = 100 + i;
        return { time, open: close - 1, high: close + 1, low: close - 2, close, value: 1000 + i, amount: 0, margin_ratio: 0 };
    });
}

const BARS = makeBars(130);

/** 主圖是 createChart 第 1 次呼叫的回傳值（第 2 次是 RSI 子圖） */
function mainChart(): MockChart {
    return createChartMock.mock.results[0].value as MockChart;
}

/** 主圖上所有 LineSeries 的 (options, series) —— 即均線 */
function maLines(chart: MockChart): { options: Record<string, unknown>; series: MockSeries }[] {
    return chart.addSeries.mock.calls
        .map((call, i) => ({ def: call[0] as unknown, options: call[1] as Record<string, unknown>, series: chart.addSeries.mock.results[i].value as MockSeries }))
        .filter(c => c.def === LineSeries)
        .map(({ options, series }) => ({ options, series }));
}

const titles = (chart: MockChart) => maLines(chart).map(l => l.options.title);

beforeAll(() => {
    // jsdom 的 clientWidth 恆為 0，StockChart 在寬度 0 時不建圖
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 800 });
});

beforeEach(() => {
    jest.clearAllMocks();
});

describe('StockChart default behaviour (existing usages)', () => {
    it('draws exactly MA5/MA20/MA60 with the original styling and no markers', () => {
        render(<StockChart data={BARS} isDarkMode={false} />);

        const lines = maLines(mainChart());
        expect(lines).toHaveLength(3);
        expect(lines.map(l => [l.options.title, l.options.color, l.options.lineWidth])).toEqual([
            ['MA5', '#3b82f6', 1],
            ['MA20', '#f59e0b', 1],
            ['MA60', '#a855f7', 1],
        ]);
        expect(createSeriesMarkersMock).not.toHaveBeenCalled();
    });

    it('feeds each MA series its SMA data', () => {
        render(<StockChart data={BARS} />);

        const [ma5, ma20, ma60] = maLines(mainChart()).map(l => l.series.setData.mock.calls[0][0] as unknown[]);
        expect([ma5.length, ma20.length, ma60.length]).toEqual([126, 111, 71]);
    });
});

describe('StockChart maPeriods', () => {
    it('draws five MA lines with distinct colors when given five periods', () => {
        render(<StockChart data={BARS} maPeriods={[5, 10, 20, 60, 120]} />);

        const lines = maLines(mainChart());
        expect(lines).toHaveLength(5);
        expect(titles(mainChart())).toEqual(['MA5', 'MA10', 'MA20', 'MA60', 'MA120']);
        expect(new Set(lines.map(l => l.options.color)).size).toBe(5);
        const ma120 = lines[4].series.setData.mock.calls[0][0] as unknown[];
        expect(ma120).toHaveLength(11);
    });

    it('adds only the missing series and removes dropped ones when maPeriods changes', () => {
        const { rerender } = render(<StockChart data={BARS} />);
        const chart = mainChart();
        expect(maLines(chart)).toHaveLength(3);

        rerender(<StockChart data={BARS} maPeriods={[5, 10, 20, 60, 120]} />);
        expect(titles(chart)).toEqual(['MA5', 'MA20', 'MA60', 'MA10', 'MA120']);
        expect(chart.removeSeries).not.toHaveBeenCalled();

        rerender(<StockChart data={BARS} maPeriods={[5, 20]} />);
        expect(chart.removeSeries).toHaveBeenCalledTimes(3);
        expect(maLines(chart)).toHaveLength(5); // 沒有重建任何 series
    });

    it('does not rebuild series when a new array with the same periods is passed', () => {
        const { rerender } = render(<StockChart data={BARS} maPeriods={[5, 20, 60]} />);
        rerender(<StockChart data={BARS} maPeriods={[5, 20, 60]} />);

        expect(maLines(mainChart())).toHaveLength(3);
        expect(mainChart().removeSeries).not.toHaveBeenCalled();
    });

    it('ignores invalid and duplicate periods', () => {
        render(<StockChart data={BARS} maPeriods={[5, 5, 0, -3, 2.5]} />);

        expect(titles(mainChart())).toEqual(['MA5']);
    });
});

describe('StockChart markers', () => {
    it('sends only markers that match a bar, as rose arrowUp below the bar', () => {
        const markers: ChartMarker[] = [
            { time: BARS[100].time, text: '首次' },
            { time: '1999-01-01' }, // 無對應 K 棒
            { time: BARS[50].time },
        ];

        expect(() => render(<StockChart data={BARS} markers={markers} />)).not.toThrow();

        expect(createSeriesMarkersMock).toHaveBeenCalledTimes(1);
        const sent = createSeriesMarkersMock.mock.calls[0][1] as { time: string; text?: string; shape: string; position: string; color: string }[];
        expect(sent.map(m => m.time)).toEqual([BARS[50].time, BARS[100].time]); // 依時間排序
        expect(sent.find(m => m.time === BARS[100].time)?.text).toBe('首次');
        for (const m of sent) {
            expect(m.shape).toBe('arrowUp');
            expect(m.position).toBe('belowBar');
            expect(m.color).toMatch(/^#(e11d48|fb7185)$/i); // rose-600 / rose-400（台股漲色）
        }
    });

    it('draws no marker plugin when every marker lacks a matching bar', () => {
        expect(() => render(<StockChart data={BARS} markers={[{ time: '1999-01-01' }]} />)).not.toThrow();

        expect(createSeriesMarkersMock).not.toHaveBeenCalled();
    });

    it('updates then clears previous markers instead of leaving them behind', () => {
        const { rerender } = render(<StockChart data={BARS} markers={[{ time: BARS[10].time }]} />);
        expect(createSeriesMarkersMock).toHaveBeenCalledTimes(1);
        const api = createSeriesMarkersMock.mock.results[0].value as MockMarkersApi;

        rerender(<StockChart data={BARS} markers={[{ time: BARS[20].time }, { time: BARS[30].time }]} />);
        expect(createSeriesMarkersMock).toHaveBeenCalledTimes(1); // 重用同一個 plugin
        expect((api.setMarkers.mock.calls.at(-1)?.[0] as { time: string }[]).map(m => m.time)).toEqual([BARS[20].time, BARS[30].time]);

        rerender(<StockChart data={BARS} />);
        expect(api.setMarkers.mock.calls.at(-1)?.[0]).toEqual([]);
    });
});
