'use client';

import React, { useEffect, useRef } from 'react';
import {
    createChart,
    ColorType,
    IChartApi,
    ISeriesApi,
    CandlestickSeries,
    HistogramSeries,
    LineSeries
} from 'lightweight-charts';
import { PriceData, IndicatorService } from '@/lib/investment/indicators';

interface StockChartProps {
    data: PriceData[];
    isDarkMode?: boolean;
}

/**
 * lightweight-charts 對傳入資料是硬性斷言（time 需唯一遞增、OHLC 需為合法數字），
 * 海外股票（如透過 ETF 持股同步進來的韓股）常有 data_date 缺漏/重複或欄位不完整，
 * 未過濾直接丟給 setData() 會在無 error boundary 保護的頁面讓整棵 React tree unmount。
 */
function sanitizePriceData(data: PriceData[]): PriceData[] {
    const byTime = new Map<string, PriceData>();
    for (const d of data) {
        if (!d.time) continue;
        const isValidNumber = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
        if (!isValidNumber(d.open) || !isValidNumber(d.high) || !isValidNumber(d.low) || !isValidNumber(d.close) || !isValidNumber(d.value)) continue;
        byTime.set(d.time, d);
    }
    return Array.from(byTime.values()).sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));
}

/**
 * StockChart Component
 * Responsible for rendering the K-line and technical indicators using Lightweight Charts.
 * Isolated from navigation and data-fetching logic.
 */
export function StockChart({ data, isDarkMode = false }: StockChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const rsiContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const rsiChartRef = useRef<IChartApi | null>(null);
    const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
    const rsiSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const maSeriesRefs = useRef<Map<number, ISeriesApi<"Line">>>(new Map());

    // 1. Initialize Chart (Mount/Unmount only)
    useEffect(() => {
        if (!chartContainerRef.current) return;
        
        const width = chartContainerRef.current.clientWidth;
        if (width === 0) return;

        const chart = createChart(chartContainerRef.current, {
            width: width,
            height: 450,
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#94a3b8',
            },
            grid: {
                vertLines: { color: 'rgba(148, 163, 184, 0.1)' },
                horzLines: { color: 'rgba(148, 163, 184, 0.1)' },
            },
            rightPriceScale: {
                borderColor: 'rgba(148, 163, 184, 0.2)',
            },
            timeScale: {
                borderColor: 'rgba(148, 163, 184, 0.2)',
                timeVisible: true,
            },
        });

        chartRef.current = chart;

        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#ef4444',
            downColor: '#22c55e',
            borderVisible: false,
            wickUpColor: '#ef4444',
            wickDownColor: '#22c55e',
        });
        candleSeriesRef.current = candleSeries;
        
        const volumeSeries = chart.addSeries(HistogramSeries, {
            color: '#3b82f6',
            priceFormat: { type: 'volume' },
            priceScaleId: '', 
        });
        volumeSeries.priceScale().applyOptions({
            scaleMargins: { top: 0.8, bottom: 0 },
        });
        volumeSeriesRef.current = volumeSeries;

        const maConfigs = [
            { period: 5, color: '#3b82f6', title: 'MA5' },
            { period: 20, color: '#f59e0b', title: 'MA20' },
            { period: 60, color: '#a855f7', title: 'MA60' },
        ];

        maConfigs.forEach(config => {
            const series = chart.addSeries(LineSeries, {
                color: config.color,
                lineWidth: 1,
                lastValueVisible: false,
                priceLineVisible: false,
                crosshairMarkerVisible: false,
                title: config.title,
            });
            maSeriesRefs.current.set(config.period, series);
        });

        // RSI 子圖表
        if (rsiContainerRef.current) {
            const rsiChart = createChart(rsiContainerRef.current, {
                width: rsiContainerRef.current.clientWidth,
                height: 120,
                layout: {
                    background: { type: ColorType.Solid, color: 'transparent' },
                    textColor: '#94a3b8',
                },
                grid: {
                    vertLines: { color: 'rgba(148, 163, 184, 0.1)' },
                    horzLines: { color: 'rgba(148, 163, 184, 0.1)' },
                },
                rightPriceScale: {
                    borderColor: 'rgba(148, 163, 184, 0.2)',
                    scaleMargins: { top: 0.1, bottom: 0.1 },
                },
                timeScale: {
                    borderColor: 'rgba(148, 163, 184, 0.2)',
                    timeVisible: true,
                    visible: false, // 隱藏 RSI 的時間軸，與主圖共用
                },
            });
            rsiChartRef.current = rsiChart;

            const rsiSeries = rsiChart.addSeries(LineSeries, {
                color: '#8b5cf6',
                lineWidth: 1,
                title: 'RSI(14)',
                lastValueVisible: true,
                priceLineVisible: false,
            });
            rsiSeriesRef.current = rsiSeries;
        }

        const handleResize = () => {
            if (chartContainerRef.current && chartRef.current) {
                chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
            if (rsiContainerRef.current && rsiChartRef.current) {
                rsiChartRef.current.applyOptions({ width: rsiContainerRef.current.clientWidth });
            }
        };

        window.addEventListener('resize', handleResize);

        // Capture refs for cleanup
        const currentMaRefs = maSeriesRefs.current;

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
            chartRef.current = null;
            candleSeriesRef.current = null;
            volumeSeriesRef.current = null;
            rsiChartRef.current?.remove();
            rsiChartRef.current = null;
            rsiSeriesRef.current = null;
            currentMaRefs.clear();
        };
    }, []); // Only on mount

    // 2. Effect: Handle Data Changes
    useEffect(() => {
        if (!chartRef.current) return;

        const cleaned = sanitizePriceData(data);
        if (cleaned.length === 0) return;

        try {
            if (candleSeriesRef.current) {
                candleSeriesRef.current.setData(cleaned);
            }

            if (volumeSeriesRef.current) {
                volumeSeriesRef.current.setData(cleaned.map(d => ({
                    time: d.time,
                    value: d.value,
                    color: d.close >= d.open ? 'rgba(239, 68, 68, 0.5)' : 'rgba(34, 197, 94, 0.5)'
                })));
            }

            const currentMaSeries = maSeriesRefs.current;
            currentMaSeries.forEach((series, period) => {
                series.setData(IndicatorService.calculateSMA(cleaned, period));
            });

            // RSI
            if (rsiSeriesRef.current) {
                rsiSeriesRef.current.setData(IndicatorService.calculateRSI(cleaned, 14));
            }
            if (rsiChartRef.current) {
                rsiChartRef.current.timeScale().fitContent();
            }

            chartRef.current.timeScale().fitContent();
        } catch (err) {
            console.error('StockChart: failed to render price data', err);
        }
    }, [data]);

    // 3. Effect: Handle Theme Changes (Dynamic Update)
    useEffect(() => {
        if (!chartRef.current) return;
        
        const themeOptions = {
            layout: {
                textColor: isDarkMode ? '#94a3b8' : '#334155',
            },
            grid: {
                vertLines: { color: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' },
                horzLines: { color: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' },
            },
            rightPriceScale: {
                borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            },
            timeScale: {
                borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            },
        };
        chartRef.current.applyOptions(themeOptions);
        rsiChartRef.current?.applyOptions(themeOptions);
    }, [isDarkMode]);

    return (
        <div className="w-full flex flex-col">
            <div ref={chartContainerRef} className="w-full" style={{ height: 450 }} />
            <div className="text-xs text-slate-400 px-2 py-1 flex items-center gap-1">
                RSI(14)
            </div>
            <div ref={rsiContainerRef} className="w-full" style={{ height: 120 }} />
        </div>
    );
}
