'use client';

import React, { useMemo, useState } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer,
} from 'recharts';
import type { WeightHistoryRow } from '@/app/investment/history/page';
import type { EtfRegistryEntry } from '@/lib/investment/etfRegistry';

interface EtfRankingHistoryChartProps {
    weightHistory: WeightHistoryRow[];
    etfRegistry: EtfRegistryEntry[];
}

const TOP_N_OPTIONS = [5, 10, 15] as const;

const STOCK_COLORS = [
    '#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6',
    '#06b6d4', '#ec4899', '#f97316', '#14b8a6', '#64748b',
    '#a855f7', '#84cc16', '#ef4444', '#0ea5e9', '#d97706',
];

export function EtfRankingHistoryChart({ weightHistory, etfRegistry }: EtfRankingHistoryChartProps) {
    const [selectedEtf, setSelectedEtf] = useState<string>(etfRegistry[0]?.code ?? '');
    const [topN, setTopN] = useState<5 | 10 | 15>(10);
    const [viewMode, setViewMode] = useState<'rank' | 'weight'>('rank');

    const { chartData, topStocks, latestDate } = useMemo(() => {
        const rows = weightHistory.filter(r => r.etf_code === selectedEtf);
        if (rows.length === 0) return { chartData: [], topStocks: [], latestDate: '' };

        // 按日期分組
        const byDate = new Map<string, WeightHistoryRow[]>();
        for (const row of rows) {
            const d = row.data_date.substring(0, 10);
            if (!byDate.has(d)) byDate.set(d, []);
            byDate.get(d)!.push(row);
        }

        const dates = Array.from(byDate.keys()).sort();
        const latest = dates[dates.length - 1];

        // 最新日期的 Top N 股票
        const latestRows = (byDate.get(latest) ?? []).sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
        const top = latestRows.slice(0, topN);

        // 建 chart data
        const data = dates.map(date => {
            const dayRows = byDate.get(date)!;
            const point: Record<string, string | number | null> = { date: date.substring(5) };
            for (const stock of top) {
                const found = dayRows.find(r => r.stock_code === stock.stock_code);
                point[stock.stock_name || stock.stock_code] = found
                    ? (viewMode === 'rank' ? found.rank : found.weight)
                    : null;
            }
            return point;
        });

        return { chartData: data, topStocks: top, latestDate: latest };
    }, [weightHistory, selectedEtf, topN, viewMode]);

    const currentEtfMeta = etfRegistry.find(e => e.code === selectedEtf);

    return (
        <div className="glass-card rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                        各 ETF 持股排名走勢
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">選擇 ETF，查看 Top N 持股的排名/權重歷史</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Top N */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                        {TOP_N_OPTIONS.map(n => (
                            <button
                                key={n}
                                onClick={() => setTopN(n)}
                                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${topN === n ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Top{n}
                            </button>
                        ))}
                    </div>
                    {/* view mode */}
                    <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                        <button
                            onClick={() => setViewMode('rank')}
                            className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'rank' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 hover:bg-slate-50'}`}
                        >
                            排名
                        </button>
                        <button
                            onClick={() => setViewMode('weight')}
                            className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'weight' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 hover:bg-slate-50'}`}
                        >
                            權重%
                        </button>
                    </div>
                </div>
            </div>

            {/* ETF 選擇 tabs */}
            <div className="flex flex-wrap gap-2">
                {etfRegistry.map(e => (
                    <button
                        key={e.code}
                        onClick={() => setSelectedEtf(e.code)}
                        className="text-xs px-3 py-1.5 rounded-full font-medium transition-all border"
                        style={selectedEtf === e.code
                            ? { backgroundColor: e.color, color: '#fff', borderColor: e.color }
                            : { backgroundColor: e.color + '15', color: e.color, borderColor: e.color + '50' }
                        }
                    >
                        {e.shortCode}
                    </button>
                ))}
            </div>

            {chartData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                    {selectedEtf} 尚無歷史資料
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    <div className="lg:col-span-3 h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis
                                    reversed={viewMode === 'rank'}
                                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                                    axisLine={false}
                                    tickLine={false}
                                    width={30}
                                    tickFormatter={v => viewMode === 'rank' ? `#${v}` : `${v}%`}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(255,255,255,0.97)', borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '11px' }}
                                    formatter={(v: number | undefined) => [viewMode === 'rank' ? `#${v ?? 0}` : `${(v ?? 0).toFixed(2)}%`]}
                                />
                                {topStocks.map((stock, i) => (
                                    <Line
                                        key={stock.stock_code}
                                        type="monotone"
                                        dataKey={stock.stock_name || stock.stock_code}
                                        stroke={STOCK_COLORS[i % STOCK_COLORS.length]}
                                        strokeWidth={2}
                                        dot={false}
                                        activeDot={{ r: 4 }}
                                        connectNulls
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* 最新排名清單 */}
                    <div className="lg:col-span-1 border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-slate-800 pt-3 lg:pt-0 lg:pl-4">
                        <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">最新排名</span>
                            <span className="text-[10px] text-slate-400 font-mono">{latestDate}</span>
                        </div>
                        <div className="space-y-1.5 overflow-y-auto max-h-[300px]">
                            {topStocks.map((stock, i) => (
                                <div key={stock.stock_code} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <div className="w-5 h-5 flex items-center justify-center rounded-full text-[9px] font-bold text-white shrink-0"
                                        style={{ backgroundColor: STOCK_COLORS[i % STOCK_COLORS.length] }}>
                                        {stock.rank}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{stock.stock_name}</div>
                                        <div className="text-[10px] text-slate-400 font-mono">{stock.stock_code}</div>
                                    </div>
                                    <span className="text-[10px] font-mono text-slate-400 ml-auto shrink-0">
                                        {stock.weight.toFixed(1)}%
                                    </span>
                                </div>
                            ))}
                        </div>
                        {currentEtfMeta && (
                            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                <div className="text-xs text-slate-500">{currentEtfMeta.name}</div>
                                <div className="text-[10px] text-slate-400">{currentEtfMeta.manager}</div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
