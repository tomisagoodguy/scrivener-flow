'use client';

import React, { useEffect, useRef } from 'react';
import {
    createChart,
    ColorType,
    IChartApi,
    LineSeries,
    CandlestickSeries,
    SeriesMarker,
    createSeriesMarkers,
    Time,
} from 'lightweight-charts';
import type { DiffEvent, ChangeType } from '@/types/investment';

interface DualAxisChartProps {
    sharesHistory: { date: string; shares: number }[];
    priceHistory: { date: string; open: number; high: number; low: number; close: number }[];
    events: DiffEvent[];
}

// Task 3.4: event marker colours
const EVENT_COLORS: Record<ChangeType, string> = {
    IN:    '#94a3b8', // grey — 建倉
    BUY:   '#e11d48', // rose — 加碼
    SELL:  '#059669', // emerald — 減碼
    OUT:   'rgba(5,150,105,0.5)', // emerald hollow-ish — 出清
    CLOSE: '#f59e0b', // amber — 大幅縮減
};

export function DualAxisChart({ sharesHistory, priceHistory, events }: DualAxisChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const buildChart = (container: HTMLDivElement): IChartApi => {
            const chart = createChart(container, {
                width: container.clientWidth,
                height: 240,
                layout: {
                    background: { type: ColorType.Solid, color: 'transparent' },
                    textColor: '#94a3b8',
                },
                grid: {
                    vertLines: { color: 'rgba(148,163,184,0.1)' },
                    horzLines: { color: 'rgba(148,163,184,0.1)' },
                },
                leftPriceScale: { visible: true, borderColor: 'rgba(148,163,184,0.2)' },
                rightPriceScale: { visible: true, borderColor: 'rgba(148,163,184,0.2)' },
                timeScale: { borderColor: 'rgba(148,163,184,0.2)', timeVisible: false },
                handleScroll: false,
                handleScale: false,
            });

            chartRef.current = chart;

            const sharesSeries = chart.addSeries(LineSeries, {
                color: '#6366f1',
                lineWidth: 2,
                priceScaleId: 'left',
                title: '股數(張)',
            });

            const sharesData = sharesHistory
                .filter(r => r.shares > 0)
                .map(r => ({ time: r.date as Time, value: r.shares / 1000 }));

            if (sharesData.length > 0) sharesSeries.setData(sharesData);

            // D2: 台股顏色慣例 — 紅漲綠跌
            const priceSeries = chart.addSeries(CandlestickSeries, {
                upColor: '#e11d48',
                downColor: '#059669',
                borderUpColor: '#e11d48',
                borderDownColor: '#059669',
                wickUpColor: '#e11d48',
                wickDownColor: '#059669',
                priceScaleId: 'right',
                title: 'K 線',
            });

            const priceData = priceHistory.map(r => ({
                time: r.date as Time,
                open: r.open,
                high: r.high,
                low: r.low,
                close: r.close,
            }));
            if (priceData.length > 0) priceSeries.setData(priceData);

            // Task 3.4: event markers
            if (sharesData.length > 0 && events.length > 0) {
                const sharesDateSet = new Set(sharesHistory.map(r => r.date));
                const markers: SeriesMarker<Time>[] = events
                    .filter(e => sharesDateSet.has(e.date))
                    .map(e => ({
                        time: e.date as Time,
                        position: e.changeType === 'BUY' || e.changeType === 'IN' ? 'belowBar' : 'aboveBar',
                        color: EVENT_COLORS[e.changeType] ?? '#94a3b8',
                        shape: e.changeType === 'OUT' ? 'arrowDown' : 'circle',
                        size: 1,
                    }));
                createSeriesMarkers(sharesSeries, markers);
            }

            chart.timeScale().fitContent();
            return chart;
        };

        // Defer chart creation until container has positive width (handles hidden tabs)
        const ro = new ResizeObserver(() => {
            const w = container.clientWidth;
            if (w <= 0) return;
            if (!chartRef.current) {
                buildChart(container);
            } else {
                chartRef.current.applyOptions({ width: w });
            }
        });
        ro.observe(container);

        // Also try immediately in case already visible
        if (container.clientWidth > 0) buildChart(container);

        return () => {
            ro.disconnect();
            chartRef.current?.remove();
            chartRef.current = null;
        };
    }, [sharesHistory, priceHistory, events]);

    if (sharesHistory.length === 0) {
        return (
            <div className="h-[240px] flex items-center justify-center text-sm text-slate-400">
                無歷史持倉資料
            </div>
        );
    }

    return (
        <div>
            <div ref={containerRef} className="w-full" />
            {/* Legend */}
            <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-0.5 bg-indigo-500" /> 股數（左軸，張）
                </span>
                <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-2 bg-rose-600/70 border border-rose-600" /> K 線（右軸，元）
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> 加碼/建倉
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" /> 減碼/出清
                </span>
            </div>
        </div>
    );
}
