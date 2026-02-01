'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface PriceChartModalProps {
    isOpen: boolean;
    onClose: () => void;
    stockCode: string;
    stockName: string;
}

interface PriceData {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    value: number;
}

export function PriceChartModal({ isOpen, onClose, stockCode, stockName }: PriceChartModalProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candleSeriesRef = useRef<any>(null);
    const volumeSeriesRef = useRef<any>(null);

    useEffect(() => {
        if (isOpen && stockCode) {
            fetchData();
        }
        
        return () => {
            if (chartRef.current) {
                chartRef.current.remove();
                chartRef.current = null;
            }
        };
    }, [isOpen, stockCode]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/investment/prices?code=${stockCode}`);
            if (!response.ok) throw new Error('無法獲取價格數據');
            const data: PriceData[] = await response.json();
            
            if (data.length === 0) throw new Error('查無歷史數據');

            renderChart(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const renderChart = (data: PriceData[]) => {
        if (!chartContainerRef.current) return;

        // Cleanup existing chart
        if (chartRef.current) {
            chartRef.current.remove();
        }

        const isDarkMode = document.documentElement.classList.contains('dark');

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
                secondsVisible: false,
            },
        });

        const candleSeries = chart.addCandlestickSeries({
            upColor: '#ef4444',     // 台股習慣：紅漲綠跌
            downColor: '#22c55e',
            borderVisible: false,
            wickUpColor: '#ef4444',
            wickDownColor: '#22c55e',
        });

        const volumeSeries = chart.addHistogramSeries({
            color: '#3b82f6',
            priceFormat: {
                type: 'volume',
            },
            priceScaleId: '', // set as an overlay by setting priceScaleId to ''
        });

        volumeSeries.priceScale().applyOptions({
            scaleMargins: {
                top: 0.8, // volume takes 20% of the chart height
                bottom: 0,
            },
        });

        candleSeries.setData(data.map(d => ({
            time: d.time,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close
        })));

        volumeSeries.setData(data.map(d => ({
            time: d.time,
            value: d.value,
            color: d.close >= d.open ? 'rgba(239, 68, 68, 0.5)' : 'rgba(34, 197, 94, 0.5)'
        })));

        chart.timeScale().fitContent();
        
        chartRef.current = chart;
        candleSeriesRef.current = candleSeries;
        volumeSeriesRef.current = volumeSeries;

        // Resize handler
        const handleResize = () => {
            if (chartContainerRef.current && chartRef.current) {
                chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl h-[650px] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        {stockCode} {stockName}
                        <span className="text-sm font-normal text-slate-500">歷史動能 K 線圖</span>
                    </DialogTitle>
                    <DialogDescription>
                        含每日開高低收與成交量數據 (最近 250 交易日)
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 min-h-0 relative bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/50 dark:bg-slate-950/50">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        </div>
                    )}
                    
                    {error && (
                        <div className="absolute inset-0 flex items-center justify-center z-10 text-red-500 font-medium">
                            {error}
                        </div>
                    )}

                    <div ref={chartContainerRef} className="w-full h-full" />
                </div>
                
                <div className="mt-4 text-xs text-slate-400 flex justify-between">
                    <span>* 數據來源：Finlab / 系統每日自動同步</span>
                    <span>* 滾輪縮放時間區間，點選拖曳檢視歷史</span>
                </div>
            </DialogContent>
        </Dialog>
    );
}
