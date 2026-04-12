'use client';

import { useEffect, useRef } from 'react';
import {
    createChart,
    ColorType,
    IChartApi,
    CandlestickSeries,
    HistogramSeries,
    LineSeries,
    type Time,
} from 'lightweight-charts';
import type { BareKSnapshot } from '@/app/api/investment/bare-k/[code]/route';

// ── 設計 Token（與 notebook 一致） ──────────────────────────────────────
const C = {
    ma5:      '#F39C12',
    ma20:     '#2E86C1',
    ma60:     '#8E44AD',
    ma120:    '#717D7E',
    h260:     '#E74C3C',
    up:       '#E74C3C',  // 紅漲
    down:     '#27AE60',  // 綠跌
    vol_ma:   '#F39C12',
    margin:   '#2E86C1',
    yoy_pos:  '#C0392B',
    yoy_neg:  '#27AE60',
    mom:      '#E67E22',
    big:      '#E74C3C',
    small:    '#27AE60',
    grid:     'rgba(200,200,200,0.25)',
    bg:       'transparent',
    text:     '#555',
};

const SIGNAL_META = [
    { key: 'hit260',    label: '創260高', color: '#E74C3C' },
    { key: 'low_vol',   label: '低波動',  color: '#27AE60' },
    { key: 'margin_ok', label: '融資健康', color: '#2E86C1' },
    { key: 'rev_9max',  label: '營收9月高', color: '#F39C12' },
    { key: 'trust_ok',  label: '投信買超', color: '#8E44AD' },
] as const;

type SignalKey = (typeof SIGNAL_META)[number]['key'];

// date string "2024-01-15" → Unix seconds
function toTime(dateStr: string): number {
    return Math.floor(new Date(dateStr).getTime() / 1000);
}

// 滾動平均（計算量 MA20）
function rollingMean(arr: (number | null)[], n: number): (number | null)[] {
    return arr.map((_, i) => {
        if (i < n - 1) return null;
        const slice = arr.slice(i - n + 1, i + 1).filter((v) => v !== null) as number[];
        return slice.length > 0 ? slice.reduce((a, b) => a + b, 0) / slice.length : null;
    });
}

function baseChartOptions(height: number, hideTimeScale = true) {
    return {
        height,
        layout: {
            background: { type: ColorType.Solid as const, color: C.bg },
            textColor: C.text,
            fontSize: 10,
        },
        grid: {
            vertLines: { color: C.grid },
            horzLines: { color: C.grid },
        },
        rightPriceScale: { borderColor: 'rgba(180,180,180,0.3)', scaleMargins: { top: 0.05, bottom: 0.05 } },
        crosshair: { mode: 1 },
        timeScale: {
            borderColor: 'rgba(180,180,180,0.3)',
            visible: !hideTimeScale,
            timeVisible: !hideTimeScale,
        },
        handleScale: false,
        handleScroll: false,
    };
}

interface Props {
    snapshot: BareKSnapshot;
    stockName?: string;
    strategies?: string[];
}

export function BareKChart({ snapshot, stockName, strategies }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartsRef = useRef<IChartApi[]>([]);

    // refs for each panel container
    const p1Ref = useRef<HTMLDivElement>(null); // K + MA
    const p3Ref = useRef<HTMLDivElement>(null); // Volume
    const p4Ref = useRef<HTMLDivElement>(null); // Margin
    const p5Ref = useRef<HTMLDivElement>(null); // Revenue
    const p6Ref = useRef<HTMLDivElement>(null); // Chips

    const { ohlcv, mas, signals, margin, revenue, inv_chips, summary } = snapshot;

    // ── 最後一日摘要 ──────────────────────────────────────────────────────
    const lastClose  = summary.last_price;
    const lastH260   = mas.h260.at(-1)?.value ?? null;
    const distPct    = summary.dist_260_pct;
    const distColor  = distPct === null ? '#555' : distPct >= -2 ? '#27AE60' : distPct >= -10 ? '#F39C12' : '#E74C3C';
    const sigs       = summary.signals;
    const lastDate   = ohlcv.at(-1)?.date ?? '';

    useEffect(() => {
        if (!p1Ref.current || !p3Ref.current || !p4Ref.current || !p5Ref.current || !p6Ref.current) return;

        const w = containerRef.current?.clientWidth ?? 800;
        chartsRef.current.forEach((c) => c.remove());
        chartsRef.current = [];

        // ── Panel 1: K 線 ────────────────────────────────────────────────
        const c1 = createChart(p1Ref.current, { ...baseChartOptions(360), width: w });
        const candle = c1.addSeries(CandlestickSeries, {
            upColor: C.up, downColor: C.down,
            borderUpColor: C.up, borderDownColor: C.down,
            wickUpColor: C.up, wickDownColor: C.down,
        });
        candle.setData(
            ohlcv
                .filter((d) => d.o !== null && d.c !== null)
                .map((d) => ({
                    time: toTime(d.date) as unknown as Time,
                    open: d.o!, high: d.h!, low: d.l!, close: d.c!,
                }))
        );

        // 均線
        const maConfigs = [
            { key: 'ma5' as const,   color: C.ma5   },
            { key: 'ma20' as const,  color: C.ma20  },
            { key: 'ma60' as const,  color: C.ma60  },
            { key: 'ma120' as const, color: C.ma120 },
        ];
        for (const { key, color } of maConfigs) {
            const series = c1.addSeries(LineSeries, { color, lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
            series.setData(
                mas[key].filter((d) => d.value !== null).map((d) => ({
                    time: toTime(d.date) as unknown as Time,
                    value: d.value!,
                }))
            );
        }
        // 260 日高（虛線）
        const h260Series = c1.addSeries(LineSeries, {
            color: C.h260, lineWidth: 1,
            lineStyle: 2, // dashed
            lastValueVisible: false, priceLineVisible: false,
        });
        h260Series.setData(
            mas.h260.filter((d) => d.value !== null).map((d) => ({
                time: toTime(d.date) as unknown as Time,
                value: d.value!,
            }))
        );
        chartsRef.current.push(c1);

        // ── Panel 3: 成交量 ──────────────────────────────────────────────
        const c3 = createChart(p3Ref.current, { ...baseChartOptions(90), width: w });
        const volumes = ohlcv.filter((d) => d.v !== null);
        const volSeries = c3.addSeries(HistogramSeries, { priceLineVisible: false });
        volSeries.setData(
            volumes.map((d) => ({
                time: toTime(d.date) as unknown as Time,
                value: d.v!,
                color: (d.c ?? 0) >= (d.o ?? 0) ? C.up : C.down,
            }))
        );
        // 量 MA20
        const volValues = volumes.map((d) => d.v);
        const volMa20   = rollingMean(volValues, 20);
        const volMaSeries = c3.addSeries(LineSeries, { color: C.vol_ma, lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
        volMaSeries.setData(
            volumes
                .map((d, i) => ({ date: d.date, value: volMa20[i] }))
                .filter((d) => d.value !== null)
                .map((d) => ({
                    time: toTime(d.date) as unknown as Time,
                    value: d.value!,
                }))
        );
        chartsRef.current.push(c3);

        // ── Panel 4: 融資維持率 ──────────────────────────────────────────
        const c4 = createChart(p4Ref.current, { ...baseChartOptions(80), width: w });
        const marginSeries = c4.addSeries(LineSeries, { color: C.margin, lineWidth: 2, lastValueVisible: false, priceLineVisible: false });
        marginSeries.setData(
            margin.map((d) => ({
                time: toTime(d.date) as unknown as Time,
                value: d.rate,
            }))
        );
        chartsRef.current.push(c4);

        // ── Panel 5: 月營收 YOY / MOM ──────────────────────────────────
        const c5 = createChart(p5Ref.current, { ...baseChartOptions(100), width: w });
        const yoySeries = c5.addSeries(HistogramSeries, { lastValueVisible: false, priceLineVisible: false });
        yoySeries.setData(
            revenue.map((d) => ({
                time: toTime(d.date) as unknown as Time,
                value: d.yoy,
                color: d.yoy >= 0 ? C.yoy_pos : C.yoy_neg,
            }))
        );
        const momSeries = c5.addSeries(LineSeries, { color: C.mom, lineWidth: 2, lineStyle: 2, lastValueVisible: false, priceLineVisible: false });
        momSeries.setData(
            revenue.map((d) => ({
                time: toTime(d.date) as unknown as Time,
                value: d.mom,
            }))
        );
        chartsRef.current.push(c5);

        // ── Panel 6: 集保籌碼（最後一個，顯示 x 軸） ─────────────────
        const c6 = createChart(p6Ref.current, { ...baseChartOptions(120, false), width: w });
        const bigSeries = c6.addSeries(HistogramSeries, { lastValueVisible: false, priceLineVisible: false });
        bigSeries.setData(
            inv_chips.map((d) => ({
                time: toTime(d.date) as unknown as Time,
                value: d.big_chg,
                color: d.big_chg >= 0 ? C.big : C.down,
            }))
        );
        const smallSeries = c6.addSeries(LineSeries, {
            color: C.small, lineWidth: 2, lineStyle: 2,
            lastValueVisible: false, priceLineVisible: false,
        });
        smallSeries.setData(
            inv_chips.map((d) => ({
                time: toTime(d.date) as unknown as Time,
                value: d.small_chg,
            }))
        );
        chartsRef.current.push(c6);

        // ── 時間軸同步（以 c1 為 master） ───────────────────────────────
        const slaves = [c3, c4, c5, c6];
        c1.timeScale().subscribeVisibleLogicalRangeChange((range) => {
            if (!range) return;
            slaves.forEach((s) => s.timeScale().setVisibleLogicalRange(range));
        });
        // fit content
        c1.timeScale().fitContent();
        slaves.forEach((s) => {
            const range = c1.timeScale().getVisibleLogicalRange();
            if (range) s.timeScale().setVisibleLogicalRange(range);
        });

        // Resize observer
        const ro = new ResizeObserver(() => {
            const newW = containerRef.current?.clientWidth ?? 800;
            chartsRef.current.forEach((c) => c.applyOptions({ width: newW }));
        });
        if (containerRef.current) ro.observe(containerRef.current);

        return () => {
            ro.disconnect();
            chartsRef.current.forEach((c) => c.remove());
            chartsRef.current = [];
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [snapshot]);

    return (
        <div ref={containerRef} className="w-full">
            {/* 標題列 */}
            <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-800 text-lg">{snapshot.stock_id}</span>
                    {stockName && <span className="text-gray-500">{stockName}</span>}
                    <span className="text-xs text-gray-400">近 {ohlcv.length} 日</span>
                    <span className="text-xs text-gray-400">{lastDate}</span>
                    {strategies && strategies.length > 0 && strategies.map((s) => (
                        <span key={s} className="text-xs px-2 py-0.5 bg-orange-50 text-orange-500 border border-orange-200 rounded-full">
                            {s}
                        </span>
                    ))}
                </div>
            </div>

            {/* K 線覆蓋層：左上條件 ✅/❌，右上收盤資訊 */}
            <div className="relative">
                <div ref={p1Ref} />
                <div className="absolute top-2 left-2 z-10 pointer-events-none">
                    <div className="flex gap-1.5 flex-wrap bg-white/80 rounded px-2 py-1 text-[11px] border border-gray-200/60">
                        {SIGNAL_META.map(({ key, label, color }) => {
                            const active = sigs[key as SignalKey];
                            return (
                                <span key={key} style={{ color: active ? color : '#bbb' }}>
                                    {active ? '✅' : '❌'} {label}
                                </span>
                            );
                        })}
                    </div>
                </div>
                <div className="absolute top-2 right-2 z-10 pointer-events-none">
                    <div className="bg-white/80 rounded px-2 py-1 text-[11px] border border-gray-200/60 text-right">
                        <span className="font-bold text-gray-800">{lastClose.toFixed(2)}</span>
                        {lastH260 && <span className="ml-2 text-gray-400">260高 {lastH260.toFixed(2)}</span>}
                        {distPct !== null && (
                            <span className="ml-2 font-medium" style={{ color: distColor }}>
                                {distPct > 0 ? '+' : ''}{distPct.toFixed(1)}%
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Panel 2: 訊號條（CSS Grid） */}
            <SignalPanel signals={signals} />

            {/* Panel 3–6 標籤 + 圖 */}
            <PanelLabel text="成交量" />
            <div ref={p3Ref} />
            <PanelLabel text={`融資維持率  最新 ${summary.last_margin?.toFixed(1) ?? '--'}%`} />
            <div ref={p4Ref} />
            <PanelLabel text={`月營收 YOY / MOM  最新 YOY ${summary.last_yoy !== null ? `${summary.last_yoy > 0 ? '+' : ''}${summary.last_yoy.toFixed(1)}%` : '--'}  MOM ${summary.last_mom !== null ? `${summary.last_mom > 0 ? '+' : ''}${summary.last_mom.toFixed(1)}%` : '--'}`} />
            <div ref={p5Ref} />
            <PanelLabel text={`集保籌碼  大戶 ${summary.last_big_chg !== null ? `${summary.last_big_chg > 0 ? '+' : ''}${summary.last_big_chg.toFixed(2)}%` : '--'}  籌碼PR ${summary.last_pr_rank?.toFixed(0) ?? '--'}`} />
            <div ref={p6Ref} />
        </div>
    );
}

function PanelLabel({ text }: { text: string }) {
    return (
        <div className="text-[10px] text-gray-400 px-2 pt-2 pb-0.5 select-none">{text}</div>
    );
}

function SignalPanel({ signals }: { signals: BareKSnapshot['signals'] }) {
    if (!signals || signals.length === 0) return null;

    // 只取最後 120 筆以免太密
    const visible = signals.slice(-120);

    return (
        <div className="relative mt-0.5 mb-0.5 overflow-hidden" style={{ height: 40 }}>
            <div className="absolute top-0 left-0 text-[9px] text-gray-400 px-1 leading-none z-10">訊號條</div>
            <div className="flex" style={{ height: '100%' }}>
                {visible.map((daySignal, di) => (
                    <div key={di} className="flex flex-col flex-1 gap-0.5 pt-3">
                        {SIGNAL_META.map(({ key, color }) => {
                            const active = daySignal[key as SignalKey];
                            return (
                                <div
                                    key={key}
                                    className="flex-1 rounded-sm"
                                    style={{ background: active ? color : 'rgba(180,180,180,0.15)' }}
                                />
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}
