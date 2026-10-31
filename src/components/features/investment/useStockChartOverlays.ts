import { useEffect, useRef, type RefObject } from 'react';
import {
    LineSeries,
    createSeriesMarkers,
    type IChartApi,
    type ISeriesApi,
    type ISeriesMarkersPluginApi,
    type SeriesMarker,
    type Time,
} from 'lightweight-charts';
import { IndicatorService, type ChartMarker, type PriceData } from '@/lib/investment/indicators';

/** 未指定 maPeriods 時的均線週期（既有使用處的畫面依賴此預設值） */
export const DEFAULT_MA_PERIODS: readonly number[] = [5, 20, 60];

// 深淺色背景都要可讀：避開 K 線紅(#ef4444)/綠(#22c55e)，120 日用中性 slate
const MA_COLORS: Record<number, string> = {
    5: '#3b82f6', // blue
    10: '#0891b2', // cyan-600
    20: '#f59e0b', // amber
    60: '#a855f7', // purple
    120: '#64748b', // slate-500
};
const FALLBACK_MA_COLORS = ['#0ea5e9', '#d946ef', '#14b8a6'];

// 台股紅漲：rose-600（淺色）/ rose-400（深色）
const MARKER_COLOR_LIGHT = '#e11d48';
const MARKER_COLOR_DARK = '#fb7185';

/** 均線顏色（圖上線條與 StockChart 圖例共用） */
export function maColor(period: number, index: number): string {
    return MA_COLORS[period] ?? FALLBACK_MA_COLORS[index % FALLBACK_MA_COLORS.length];
}

export function normalizePeriods(periods: readonly number[]): number[] {
    return Array.from(new Set(periods)).filter(p => Number.isInteger(p) && p > 0);
}

interface StockChartOverlayOptions {
    chartRef: RefObject<IChartApi | null>;
    candleSeriesRef: RefObject<ISeriesApi<'Candlestick'> | null>;
    /** 已通過 sanitizePriceData 的 K 線資料 */
    data: PriceData[];
    maPeriods: readonly number[];
    markers?: readonly ChartMarker[];
    isDarkMode: boolean;
}

/**
 * StockChart 的均線與訊號標記圖層。
 * 必須在 StockChart 的「建圖」與「設定 K 線資料」effect 之後呼叫（effect 依宣告順序執行）。
 * 以 chart / series 實例比對判斷是否已被重建（StrictMode、重新掛載），不依賴 cleanup，
 * 因為 chart.remove() 之後再對舊 series 操作會拋錯。
 */
export function useStockChartOverlays({ chartRef, candleSeriesRef, data, maPeriods, markers, isDarkMode }: StockChartOverlayOptions): void {
    const maRef = useRef<{ chart: IChartApi; series: Map<number, ISeriesApi<'Line'>> } | null>(null);
    const markersRef = useRef<{ series: ISeriesApi<'Candlestick'>; plugin: ISeriesMarkersPluginApi<Time> } | null>(null);

    // 以字串當 dependency，呼叫端每次 render 傳新陣列字面值也不會重建 series
    const periodsKey = normalizePeriods(maPeriods).join(',');

    // 均線：只新增缺的、移除多的，其餘沿用；資料變動時重算
    useEffect(() => {
        const chart = chartRef.current;
        if (!chart) return;

        try {
            const periods = periodsKey ? periodsKey.split(',').map(Number) : [];
            if (maRef.current?.chart !== chart) maRef.current = { chart, series: new Map() };
            const { series } = maRef.current;

            series.forEach((line, period) => {
                if (periods.includes(period)) return;
                chart.removeSeries(line);
                series.delete(period);
            });
            periods.forEach((period, i) => {
                if (series.has(period)) return;
                series.set(period, chart.addSeries(LineSeries, {
                    color: maColor(period, i),
                    lineWidth: 1,
                    lastValueVisible: false,
                    priceLineVisible: false,
                    crosshairMarkerVisible: false,
                    // 不設 title：價格軸上的 MA 標籤會擋住 K 線，改由 StockChart 上方圖例標示
                }));
            });

            if (data.length === 0) return;
            series.forEach((line, period) => {
                line.setData(IndicatorService.calculateSMA(data, period));
            });
        } catch (err) {
            console.error('StockChart: failed to render moving averages', err);
        }
    }, [chartRef, data, periodsKey]);

    // 標記：只送出有對應 K 棒的；之後以 setMarkers 更新／清空，不重複建立 plugin
    useEffect(() => {
        const candleSeries = candleSeriesRef.current;
        if (!candleSeries) return;

        try {
            const barTimes = new Set(data.map(d => d.time));
            const color = isDarkMode ? MARKER_COLOR_DARK : MARKER_COLOR_LIGHT;
            const visible: SeriesMarker<Time>[] = (markers ?? [])
                .filter(m => barTimes.has(m.time))
                .sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0))
                .map(m => ({ time: m.time, position: 'belowBar', shape: 'arrowUp', color, text: m.text }));

            if (markersRef.current?.series !== candleSeries) markersRef.current = null;
            if (markersRef.current) {
                markersRef.current.plugin.setMarkers(visible);
            } else if (visible.length > 0) {
                markersRef.current = { series: candleSeries, plugin: createSeriesMarkers(candleSeries, visible) };
            }
        } catch (err) {
            console.error('StockChart: failed to render markers', err);
        }
    }, [candleSeriesRef, data, markers, isDarkMode]);
}
