import {
    createChart,
    CandlestickSeries,
    HistogramSeries,
    LineSeries,
    createSeriesMarkers,
    type Time,
    type IChartApi,
    type SeriesMarker,
} from 'lightweight-charts';
import type { BareKSnapshot } from '@/app/api/investment/bare-k/[code]/route';
import type { StrategyHoldingMarks } from '@/lib/investment/strategyTradeUtils';
import { C, baseChartOptions, toTime, rollingMean } from './BareKChartConfig';
import { TradeLabelsPrimitive, buildTradeLabels } from './BareKTradeLabels';

// 台股紅漲：與 StockChart 入選日標記同色（rose-600）
const SIGNAL_MARKER_COLOR = '#e11d48';
// 持有期間背景：rose-600 低透明度
const HOLDING_BG_COLOR = 'rgba(225, 29, 72, 0.08)';
const HOLDING_BG_SCALE = 'holding-bg';

/**
 * 入選日箭頭標記：只為實際畫成 K 棒（有 o/c）的日期產生，依時間遞增、同一時間只留一個。
 */
export function buildSignalMarkers(
    ohlcv: BareKSnapshot['ohlcv'],
    markerDates: readonly string[],
): SeriesMarker<Time>[] {
    const barDates = new Set(ohlcv.filter(d => d.o !== null && d.c !== null).map(d => d.date));
    const times = new Set<number>();
    for (const date of markerDates) {
        if (barDates.has(date)) times.add(toTime(date));
    }
    return Array.from(times)
        .sort((a, b) => a - b)
        .map((time): SeriesMarker<Time> => ({
            time: time as unknown as Time,
            position: 'belowBar',
            shape: 'arrowUp',
            color: SIGNAL_MARKER_COLOR,
        }));
}

/** 有畫成 K 棒（o/c 非 null）的 ohlcv 列 */
function drawnBars(ohlcv: BareKSnapshot['ohlcv']): BareKSnapshot['ohlcv'] {
    return ohlcv.filter(d => d.o !== null && d.c !== null);
}

/**
 * 持有期間背景：落在任一區間（end 為 null＝延伸到最新 K 棒）的 K 棒各給一根滿高長條，天然聯集、同色不疊深。
 */
export function buildHoldingBackground(
    ohlcv: BareKSnapshot['ohlcv'],
    periods: StrategyHoldingMarks['periods'],
): { time: Time; value: number; color: string }[] {
    if (periods.length === 0) return [];
    return drawnBars(ohlcv)
        .filter(d => periods.some(p => d.date >= p.start && (p.end === null || d.date <= p.end)))
        .map(d => ({ time: toTime(d.date) as unknown as Time, value: 1, color: HOLDING_BG_COLOR }));
}

export function createKLinePanel(
    container: HTMLDivElement,
    width: number,
    ohlcv: BareKSnapshot['ohlcv'],
    mas: BareKSnapshot['mas'],
    markerDates?: readonly string[],
    holdingMarks?: StrategyHoldingMarks,
): IChartApi {
    const c = createChart(container, { ...baseChartOptions(360), width });

    // 背景須先加入才會畫在 K 棒下層；獨立隱藏價格軸不影響 K 線縮放
    if (holdingMarks) {
        const bg = c.addSeries(HistogramSeries, {
            priceScaleId: HOLDING_BG_SCALE,
            priceLineVisible: false,
            lastValueVisible: false,
        });
        c.priceScale(HOLDING_BG_SCALE).applyOptions({ visible: false, scaleMargins: { top: 0, bottom: 0 } });
        bg.setData(buildHoldingBackground(ohlcv, holdingMarks.periods));
    }

    const candle = c.addSeries(CandlestickSeries, {
        upColor: C.up, downColor: C.down,
        borderUpColor: C.up, borderDownColor: C.down,
        wickUpColor: C.up, wickDownColor: C.down,
    });
    candle.setData(
        ohlcv.filter(d => d.o !== null && d.c !== null).map(d => ({
            time: toTime(d.date) as unknown as Time,
            open: d.o!, high: d.h!, low: d.l!, close: d.c!,
        }))
    );

    const markers = markerDates ? buildSignalMarkers(ohlcv, markerDates) : [];
    if (markers.length > 0) createSeriesMarkers(candle, markers);
    if (holdingMarks) {
        // 加大上下邊距，位於極值的「買」「賣」標籤才留在圖內
        candle.priceScale().applyOptions({ scaleMargins: { top: 0.12, bottom: 0.15 } });
        candle.attachPrimitive(new TradeLabelsPrimitive(buildTradeLabels(ohlcv, holdingMarks)));
    }

    const maConfigs = [
        { key: 'ma5' as const, color: C.ma5 },
        { key: 'ma20' as const, color: C.ma20 },
        { key: 'ma60' as const, color: C.ma60 },
        { key: 'ma120' as const, color: C.ma120 },
    ];
    for (const { key, color } of maConfigs) {
        const s = c.addSeries(LineSeries, { color, lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
        s.setData(mas[key].filter(d => d.value !== null).map(d => ({ time: toTime(d.date) as unknown as Time, value: d.value! })));
    }

    const h260 = c.addSeries(LineSeries, { color: C.h260, lineWidth: 1, lineStyle: 2, lastValueVisible: false, priceLineVisible: false });
    h260.setData(mas.h260.filter(d => d.value !== null).map(d => ({ time: toTime(d.date) as unknown as Time, value: d.value! })));

    return c;
}

export function createVolumePanel(
    container: HTMLDivElement,
    width: number,
    ohlcv: BareKSnapshot['ohlcv'],
): IChartApi {
    const c = createChart(container, { ...baseChartOptions(90), width });
    const volumes = ohlcv.filter(d => d.v !== null);

    const vol = c.addSeries(HistogramSeries, { priceLineVisible: false });
    vol.setData(volumes.map(d => ({
        time: toTime(d.date) as unknown as Time,
        value: d.v!,
        color: (d.c ?? 0) >= (d.o ?? 0) ? C.up : C.down,
    })));

    const volMa20 = rollingMean(volumes.map(d => d.v), 20);
    const volMa = c.addSeries(LineSeries, { color: C.vol_ma, lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
    volMa.setData(
        volumes.map((d, i) => ({ date: d.date, value: volMa20[i] }))
            .filter(d => d.value !== null)
            .map(d => ({ time: toTime(d.date) as unknown as Time, value: d.value! }))
    );
    return c;
}

export function createMarginPanel(
    container: HTMLDivElement,
    width: number,
    margin: BareKSnapshot['margin'],
): IChartApi {
    const c = createChart(container, { ...baseChartOptions(80), width });
    const s = c.addSeries(LineSeries, { color: C.margin, lineWidth: 2, lastValueVisible: false, priceLineVisible: false });
    s.setData(margin.map(d => ({ time: toTime(d.date) as unknown as Time, value: d.rate })));
    return c;
}

export function createRevenuePanel(
    container: HTMLDivElement,
    width: number,
    revenue: BareKSnapshot['revenue'],
): IChartApi {
    const c = createChart(container, { ...baseChartOptions(100), width });

    const yoy = c.addSeries(HistogramSeries, { lastValueVisible: false, priceLineVisible: false });
    yoy.setData(revenue.map(d => ({
        time: toTime(d.date) as unknown as Time,
        value: d.yoy,
        color: d.yoy >= 0 ? C.yoy_pos : C.yoy_neg,
    })));

    const mom = c.addSeries(LineSeries, { color: C.mom, lineWidth: 2, lineStyle: 2, lastValueVisible: false, priceLineVisible: false });
    mom.setData(revenue.map(d => ({ time: toTime(d.date) as unknown as Time, value: d.mom })));
    return c;
}

export function createChipsPanel(
    container: HTMLDivElement,
    width: number,
    inv_chips: BareKSnapshot['inv_chips'],
): IChartApi {
    const c = createChart(container, { ...baseChartOptions(120, false), width });

    const big = c.addSeries(HistogramSeries, { lastValueVisible: false, priceLineVisible: false });
    big.setData(inv_chips.map(d => ({
        time: toTime(d.date) as unknown as Time,
        value: d.big_chg,
        color: d.big_chg >= 0 ? C.big : C.down,
    })));

    const small = c.addSeries(LineSeries, { color: C.small, lineWidth: 2, lineStyle: 2, lastValueVisible: false, priceLineVisible: false });
    small.setData(inv_chips.map(d => ({ time: toTime(d.date) as unknown as Time, value: d.small_chg })));
    return c;
}
