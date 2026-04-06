'use client';

import React, { useMemo, useState } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend,
} from 'recharts';
import type { WeightHistoryRow } from '@/app/investment/history/page';
import type { EtfRegistryEntry } from '@/lib/investment/etfRegistry';

interface StockWeightCrossEtfChartProps {
    weightHistory: WeightHistoryRow[];
    stockList: { code: string; name: string }[];
    etfRegistry: EtfRegistryEntry[];
}

type ViewMode = 'weight' | 'rank';

export function StockWeightCrossEtfChart({ weightHistory, stockList, etfRegistry }: StockWeightCrossEtfChartProps) {
    const [selectedStock, setSelectedStock] = useState<string>(stockList[0]?.code ?? '');
    const [viewMode, setViewMode] = useState<ViewMode>('weight');
    const [search, setSearch] = useState('');

    const etfColorMap = useMemo(() => {
        const m: Record<string, string> = {};
        for (const e of etfRegistry) m[e.code] = e.color;
        return m;
    }, [etfRegistry]);

    const filteredStockList = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return stockList;
        return stockList.filter(s => s.code.includes(q) || s.name.toLowerCase().includes(q));
    }, [stockList, search]);

    // 取出該股在各 ETF 的走勢
    const { chartData, activeEtfs } = useMemo(() => {
        if (!selectedStock) return { chartData: [], activeEtfs: [] };

        const rows = weightHistory.filter(r => r.stock_code === selectedStock);
        if (rows.length === 0) return { chartData: [], activeEtfs: [] };

        // 找有資料的 ETF
        const etfSet = new Set(rows.map(r => r.etf_code));
        const active = etfRegistry.filter(e => etfSet.has(e.code));

        // 按日期聚合
        const byDate = new Map<string, Record<string, number>>();
        for (const row of rows) {
            const d = row.data_date.substring(0, 10);
            if (!byDate.has(d)) byDate.set(d, {});
            byDate.get(d)![row.etf_code] = viewMode === 'weight' ? row.weight : row.rank;
        }

        const data = Array.from(byDate.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, vals]) => ({
                date: date.substring(5), // MM-DD
                _full: date,
                ...vals,
            }));

        return { chartData: data, activeEtfs: active };
    }, [selectedStock, viewMode, weightHistory, etfRegistry]);

    const selectedStockName = stockList.find(s => s.code === selectedStock)?.name ?? '';

    return (
        <div className="glass-card rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                        個股跨 ETF 持倉走勢
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">選一支股票，查看各家 ETF 的配置比較</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                        <button
                            onClick={() => setViewMode('weight')}
                            className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'weight' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'}`}
                        >
                            權重%
                        </button>
                        <button
                            onClick={() => setViewMode('rank')}
                            className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'rank' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'}`}
                        >
                            持股排名
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* 股票選擇清單 */}
                <div className="lg:col-span-1 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                    <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                        <input
                            type="text"
                            placeholder="搜尋股票..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full text-xs px-2 py-1.5 rounded-lg bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400"
                        />
                    </div>
                    <div className="overflow-y-auto max-h-[340px]">
                        {filteredStockList.map(s => (
                            <button
                                key={s.code}
                                onClick={() => setSelectedStock(s.code)}
                                className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2 ${
                                    selectedStock === s.code
                                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                }`}
                            >
                                <span className="font-mono">{s.code}</span>
                                <span className="truncate">{s.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* 圖表 */}
                <div className="lg:col-span-3">
                    {chartData.length === 0 ? (
                        <div className="h-[360px] flex items-center justify-center text-slate-400 text-sm">
                            {selectedStock ? `${selectedStock} 無歷史資料` : '請選擇股票'}
                        </div>
                    ) : (
                        <div>
                            <div className="mb-3 flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    {selectedStock} {selectedStockName}
                                </span>
                                <div className="flex items-center gap-3 ml-2">
                                    {activeEtfs.map(e => (
                                        <span key={e.code} className="flex items-center gap-1 text-xs text-slate-500">
                                            <span className="w-3 h-0.5 inline-block rounded" style={{ backgroundColor: e.color }} />
                                            {e.shortCode}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <ResponsiveContainer width="100%" height={320}>
                                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                    <YAxis
                                        reversed={viewMode === 'rank'}
                                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                                        axisLine={false}
                                        tickLine={false}
                                        width={30}
                                        tickFormatter={v => viewMode === 'weight' ? `${v}%` : `#${v}`}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
                                        formatter={(v: number) => viewMode === 'weight' ? [`${v.toFixed(2)}%`] : [`#${v}`]}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                                    {activeEtfs.map(e => (
                                        <Line
                                            key={e.code}
                                            type="monotone"
                                            dataKey={e.code}
                                            name={e.shortCode}
                                            stroke={etfColorMap[e.code]}
                                            strokeWidth={2.5}
                                            dot={{ r: 3, strokeWidth: 2, fill: '#fff' }}
                                            activeDot={{ r: 5 }}
                                            connectNulls
                                        />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
