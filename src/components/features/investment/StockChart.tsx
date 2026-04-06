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
 * StockChart Component
 * Responsible for rendering the K-line and technical indicators using Lightweight Charts.
 * Isolated from navigation and data-fetching logic.
 */
export function StockChart({ data, isDarkMode = false }: StockChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
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

        const handleResize = () => {
            if (chartContainerRef.current && chartRef.current) {
                chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
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
            currentMaRefs.clear();
        };
    }, []); // Only on mount

    // 2. Effect: Handle Data Changes
    useEffect(() => {
        if (!chartRef.current || data.length === 0) return;
        
        if (candleSeriesRef.current) {
            candleSeriesRef.current.setData(data);
        }

        if (volumeSeriesRef.current) {
            volumeSeriesRef.current.setData(data.map(d => ({
                time: d.time,
                value: d.value,
                color: d.close >= d.open ? 'rgba(239, 68, 68, 0.5)' : 'rgba(34, 197, 94, 0.5)'
            })));
        }

        const currentMaSeries = maSeriesRefs.current;
        currentMaSeries.forEach((series, period) => {
            series.setData(IndicatorService.calculateSMA(data, period));
        });

        chartRef.current.timeScale().fitContent();

    }, [data]);

    // 3. Effect: Handle Theme Changes (Dynamic Update)
    useEffect(() => {
        if (!chartRef.current) return;
        
        chartRef.current.applyOptions({
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
        });
    }, [isDarkMode]);

    return <div ref={chartContainerRef} className="w-full h-full" />;
}
