'use client';

import React, { useEffect, useRef } from 'react';
import { 
    createChart, 
    ColorType, 
    IChartApi, 
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

    useEffect(() => {
        if (!chartContainerRef.current || data.length === 0) return;

        // 1. Initialize Chart
        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: 450,
            layout: {
                background: { type: ColorType.Solid, color: isDarkMode ? '#0f172a' : '#ffffff' },
                textColor: isDarkMode ? '#94a3b8' : '#334155',
            },
            grid: {
                vertLines: { color: isDarkMode ? '#334155' : '#e2e8f0' },
                horzLines: { color: isDarkMode ? '#334155' : '#e2e8f0' },
            },
            rightPriceScale: {
                borderColor: isDarkMode ? '#334155' : '#e2e8f0',
            },
            timeScale: {
                borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                timeVisible: true,
            },
        });

        // 2. Add Candlestick Series
        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#ef4444',
            downColor: '#22c55e',
            borderVisible: false,
            wickUpColor: '#ef4444',
            wickDownColor: '#22c55e',
        });
        candleSeries.setData(data);

        // 3. Add Volume Series (Weighted by Amount if desired, but we'll stick to Volume)
        const volumeSeries = chart.addSeries(HistogramSeries, {
            color: '#3b82f6',
            priceFormat: { type: 'volume' },
            priceScaleId: '',
        });
        volumeSeries.priceScale().applyOptions({
            scaleMargins: { top: 0.8, bottom: 0 },
        });
        volumeSeries.setData(data.map(d => ({
            time: d.time,
            value: d.value,
            color: d.close >= d.open ? 'rgba(239, 68, 68, 0.5)' : 'rgba(34, 197, 94, 0.5)'
        })));

        // 4. Add MA Indicators
        const maConfigs = [
            { period: 5, color: '#3b82f6', title: 'MA5' },
            { period: 20, color: '#f59e0b', title: 'MA20' },
            { period: 60, color: '#a855f7', title: 'MA60' },
        ];

        maConfigs.forEach(config => {
            const maSeries = chart.addSeries(LineSeries, {
                color: config.color,
                lineWidth: 1,
                lastValueVisible: false,
                priceLineVisible: false,
                crosshairMarkerVisible: false,
                title: config.title,
            });
            maSeries.setData(IndicatorService.calculateSMA(data, config.period));
        });

        chart.timeScale().fitContent();
        chartRef.current = chart;

        const handleResize = () => {
            if (chartContainerRef.current && chartRef.current) {
                chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [data, isDarkMode]);

    return <div ref={chartContainerRef} className="w-full h-full" />;
}
