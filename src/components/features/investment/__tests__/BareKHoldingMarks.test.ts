/**
 * 策略持有標記（change: strategy-chart-holding-marks, task 2.1）：
 * 持有期間背景（區間聯集）、createKLinePanel 串接「買」「賣」標籤 primitive（change: strategy-chart-trade-labels）。
 */

import type { BareKSnapshot } from '@/app/api/investment/bare-k/[code]/route';
import { createChart, createSeriesMarkers } from 'lightweight-charts';
import { toTime } from '../BareKChartConfig';
import { buildHoldingBackground, createKLinePanel } from '../BareKChartPanels';
import { TradeLabelsPrimitive } from '../BareKTradeLabels';

jest.mock('lightweight-charts', () => ({
    ColorType: { Solid: 'solid' },
    CandlestickSeries: { kind: 'Candlestick' },
    HistogramSeries: { kind: 'Histogram' },
    LineSeries: { kind: 'Line' },
    createChart: jest.fn(),
    createSeriesMarkers: jest.fn(),
}), { virtual: true });

type Bar = BareKSnapshot['ohlcv'][number];

function bar(date: string, close: number | null = 100): Bar {
    return { date, o: close, h: close, l: close, c: close, v: 1000, change_pct: 0 };
}

const DATES = ['2026-09-01', '2026-09-10', '2026-09-15', '2026-09-20', '2026-10-01', '2026-10-05', '2026-10-15', '2026-10-30'];
const OHLCV: BareKSnapshot['ohlcv'] = DATES.map(d => bar(d));

function shadedDates(periods: { start: string; end: string | null }[]): string[] {
    return buildHoldingBackground(OHLCV, periods).map(p => DATES.find(d => toTime(d) === Number(p.time))!);
}

describe('buildHoldingBackground', () => {
    it('重疊區間取聯集、同一顏色（09-01→09-20 ∪ 09-15→10-05）', () => {
        const points = buildHoldingBackground(OHLCV, [
            { start: '2026-09-01', end: '2026-09-20' },
            { start: '2026-09-15', end: '2026-10-05' },
        ]);

        expect(shadedDates([
            { start: '2026-09-01', end: '2026-09-20' },
            { start: '2026-09-15', end: '2026-10-05' },
        ])).toEqual(['2026-09-01', '2026-09-10', '2026-09-15', '2026-09-20', '2026-10-01', '2026-10-05']);
        expect(new Set(points.map(p => p.color)).size).toBe(1);
        expect(points.every(p => p.value === 1)).toBe(true);
    });

    it('持有中（end 為 null）延伸到最新 K 棒；分離區間各自塗', () => {
        expect(shadedDates([
            { start: '2026-09-01', end: '2026-09-10' },
            { start: '2026-10-01', end: null },
        ])).toEqual(['2026-09-01', '2026-09-10', '2026-10-01', '2026-10-05', '2026-10-15', '2026-10-30']);
    });

    it('無區間 → 不塗', () => {
        expect(buildHoldingBackground(OHLCV, [])).toEqual([]);
    });

    it('o/c 為 null 的日期不塗', () => {
        const ohlcv = [bar('2026-10-01'), bar('2026-10-05', null)];
        expect(buildHoldingBackground(ohlcv, [{ start: '2026-10-01', end: null }]).map(p => p.time))
            .toEqual([toTime('2026-10-01')]);
    });
});

describe('createKLinePanel with holdingMarks', () => {
    function mockChart() {
        const series = { setData: jest.fn(), attachPrimitive: jest.fn() };
        const priceScale = { applyOptions: jest.fn() };
        const chart = { addSeries: jest.fn(() => series), priceScale: jest.fn(() => priceScale) };
        (createChart as jest.Mock).mockReturnValue(chart);
        return { chart, series, priceScale };
    }
    const MAS = { ma5: [], ma20: [], ma60: [], ma120: [], h260: [] } as unknown as BareKSnapshot['mas'];

    beforeEach(() => jest.clearAllMocks());

    it('背景 Histogram 在 K 線之前加入、掛隱藏價格軸；「買」「賣」改掛 primitive，內建 marker 只剩發散箭頭', () => {
        const { chart, series, priceScale } = mockChart();
        createKLinePanel({} as HTMLDivElement, 800, OHLCV, MAS, ['2026-09-10'], {
            entryDates: ['2026-10-01'],
            exitDates: ['2026-10-15'],
            periods: [{ start: '2026-10-01', end: '2026-10-15' }],
        });

        const calls = chart.addSeries.mock.calls as unknown as [{ kind: string }, Record<string, unknown>][];
        expect(calls[0][0].kind).toBe('Histogram');
        expect(calls[0][1].priceScaleId).toBe('holding-bg');
        expect(calls[1][0].kind).toBe('Candlestick');
        expect(chart.priceScale).toHaveBeenCalledWith('holding-bg');
        expect(priceScale.applyOptions).toHaveBeenCalledWith(expect.objectContaining({ visible: false }));

        expect(createSeriesMarkers).toHaveBeenCalledTimes(1);
        const markers = (createSeriesMarkers as jest.Mock).mock.calls[0][1] as { time: number }[];
        expect(markers.map(m => m.time)).toEqual([toTime('2026-09-10')]);
        expect(series.attachPrimitive).toHaveBeenCalledTimes(1);
        expect(series.attachPrimitive.mock.calls[0][0]).toBeInstanceOf(TradeLabelsPrimitive);
    });

    it('未傳 holdingMarks → 不加背景 series，第一個 series 是 K 線', () => {
        const { chart, series } = mockChart();
        createKLinePanel({} as HTMLDivElement, 800, OHLCV, MAS);
        expect(series.attachPrimitive).not.toHaveBeenCalled();

        const calls = chart.addSeries.mock.calls as unknown as [{ kind: string }][];
        expect(calls[0][0].kind).toBe('Candlestick');
        expect(chart.priceScale).not.toHaveBeenCalled();
        expect(createSeriesMarkers).not.toHaveBeenCalled();
    });
});
