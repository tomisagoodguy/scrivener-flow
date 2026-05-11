import {
    createChart,
    CandlestickSeries,
    HistogramSeries,
    LineSeries,
    type Time,
    type IChartApi,
} from 'lightweight-charts';
import type { BareKSnapshot } from '@/app/api/investment/bare-k/[code]/route';
import { C, baseChartOptions, toTime, rollingMean } from './BareKChartConfig';

export function createKLinePanel(
    container: HTMLDivElement,
    width: number,
    ohlcv: BareKSnapshot['ohlcv'],
    mas: BareKSnapshot['mas'],
): IChartApi {
    const c = createChart(container, { ...baseChartOptions(360), width });

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
