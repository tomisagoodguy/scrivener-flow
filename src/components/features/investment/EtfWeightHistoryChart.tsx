'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, LineSeries } from 'lightweight-charts';

interface WeightHistoryEntry {
    date: string;
    weight: number;
    rank: number;
}

interface EtfWeightHistoryChartProps {
    stockCode: string;
    data: Record<string, WeightHistoryEntry[]>;
}

const ETF_CONFIG: Record<string, { color: string; label: string }> = {
    '00981A': { color: '#8b5cf6', label: '00981A 統一台股增長' },
    '00980A': { color: '#3b82f6', label: '00980A 野村智慧優選' },
    '00991A': { color: '#f59e0b', label: '00991A 復華未來50' },
    '00982A': { color: '#10b981', label: '00982A 中信優選成長' },
    '00984A': { color: '#f43f5e', label: '00984A 群益主動優選' },
    '00985A': { color: '#06b6d4', label: '00985A 元大主動選股' },
    '00987A': { color: '#84cc16', label: '00987A 凱基主動精選' },
    '00992A': { color: '#a855f7', label: '00992A 統一主動選股' },
    '00993A': { color: '#fb923c', label: '00993A 永豐主動選股' },
    '00994A': { color: '#64748b', label: '00994A 新光主動選股' },
    '00995A': { color: '#ec4899', label: '00995A 台新主動選股' },
};

type ViewMode = 'rank' | 'weight';

export function EtfWeightHistoryChart({ stockCode, data }: EtfWeightHistoryChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('rank');

    // 6.5 若三 ETF 均無資料，隱藏整個模組
    const hasAnyData = Object.values(data).some(arr => arr.length > 0);
    if (!hasAnyData) return null;

    return (
        <EtfWeightHistoryChartInner
            stockCode={stockCode}
            data={data}
            viewMode={viewMode}
            setViewMode={setViewMode}
            chartContainerRef={chartContainerRef}
            chartRef={chartRef}
        />
    );
}

// 分離 Inner 是因為需要在 hasAnyData 判斷後才能安全使用 hooks
function EtfWeightHistoryChartInner({
    stockCode,
    data,
    viewMode,
    setViewMode,
    chartContainerRef,
    chartRef,
}: {
    stockCode: string;
    data: Record<string, WeightHistoryEntry[]>;
    viewMode: ViewMode;
    setViewMode: (m: ViewMode) => void;
    chartContainerRef: React.RefObject<HTMLDivElement | null>;
    chartRef: React.RefObject<IChartApi | null>;
}) {
    const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

    useEffect(() => {
        if (!chartContainerRef.current) return;
        const width = chartContainerRef.current.clientWidth;
        if (width === 0) return;

        if (chartRef.current) {
            chartRef.current.remove();
            (chartRef as React.MutableRefObject<IChartApi | null>).current = null;
        }

        const chart = createChart(chartContainerRef.current, {
            width,
            height: 280,
            layout: {
                background: { type: ColorType.Solid, color: isDark ? '#0f172a' : '#ffffff' },
                textColor: isDark ? '#94a3b8' : '#64748b',
            },
            grid: {
                vertLines: { color: isDark ? '#1e293b' : '#f1f5f9' },
                horzLines: { color: isDark ? '#1e293b' : '#f1f5f9' },
            },
            rightPriceScale: {
                // 6.3 排名視角時 Y 軸反轉
                invertScale: viewMode === 'rank',
                borderColor: isDark ? '#334155' : '#e2e8f0',
            },
            timeScale: {
                borderColor: isDark ? '#334155' : '#e2e8f0',
                timeVisible: true,
            },
        });

        (chartRef as React.MutableRefObject<IChartApi | null>).current = chart;

        for (const [etfCode, entries] of Object.entries(data)) {
            // 6.4 未持有期間不繪製（只繪製有資料的點，自動斷線）
            if (entries.length === 0) continue;

            const config = ETF_CONFIG[etfCode];
            if (!config) continue;

            const lineSeries = chart.addSeries(LineSeries, {
                color: config.color,
                lineWidth: 2,
                title: etfCode,
                priceLineVisible: false,
                lastValueVisible: true,
            });

            const seriesData = entries
                .filter(e => e.date)
                .map(e => ({
                    time: e.date as `${number}-${number}-${number}`,
                    value: viewMode === 'rank' ? e.rank : e.weight,
                }))
                .filter(e => e.value > 0);

            if (seriesData.length > 0) {
                lineSeries.setData(seriesData);
            }
        }

        chart.timeScale().fitContent();

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
            (chartRef as React.MutableRefObject<IChartApi | null>).current = null;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, viewMode, isDark]);

    const activeEtfs = Object.entries(ETF_CONFIG).filter(([code]) => (data[code]?.length ?? 0) > 0);

    return (
        <div className="col-span-1 lg:col-span-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    📊 ETF 持倉歷史 — {stockCode}
                </h2>
                <div className="flex items-center gap-2">
                    {/* 圖例 */}
                    <div className="flex items-center gap-3 mr-3">
                        {activeEtfs.map(([code, cfg]) => (
                            <span key={code} className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                                <span className="w-4 h-0.5 inline-block rounded" style={{ backgroundColor: cfg.color }} />
                                {code}
                            </span>
                        ))}
                    </div>
                    {/* 6.3 Y 軸切換按鈕 */}
                    <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                        <button
                            onClick={() => setViewMode('rank')}
                            className={`px-3 py-1 text-xs font-medium transition-colors ${
                                viewMode === 'rank'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                        >
                            持股排名
                        </button>
                        <button
                            onClick={() => setViewMode('weight')}
                            className={`px-3 py-1 text-xs font-medium transition-colors ${
                                viewMode === 'weight'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                        >
                            權重%
                        </button>
                    </div>
                </div>
            </div>
            <div ref={chartContainerRef} />
        </div>
    );
}
