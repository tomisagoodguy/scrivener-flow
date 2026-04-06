'use client';

import React, { useState } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend,
} from 'recharts';

interface OverlapTrendRow {
    date: string;
    total: number;
    shared2: number;
    shared3: number;
    shared5: number;
    shared7: number;
    pct2: number;
    pct3: number;
    pct5: number;
    pct7: number;
}

interface EtfOverlapTrendChartProps {
    data: OverlapTrendRow[];
    totalEtfs: number;
}

type MetricMode = 'pct' | 'count';

const SERIES = [
    { key: 'pct7', countKey: 'shared7', label: '7+ 家共持', color: '#ef4444' },
    { key: 'pct5', countKey: 'shared5', label: '5+ 家共持', color: '#f97316' },
    { key: 'pct3', countKey: 'shared3', label: '3+ 家共持', color: '#f59e0b' },
    { key: 'pct2', countKey: 'shared2', label: '2+ 家共持', color: '#10b981' },
] as const;

export function EtfOverlapTrendChart({ data, totalEtfs }: EtfOverlapTrendChartProps) {
    const [mode, setMode] = useState<MetricMode>('pct');

    if (data.length === 0) {
        return (
            <div className="glass-card rounded-2xl p-6">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-4">共識持股趨勢</h3>
                <div className="h-64 flex items-center justify-center text-slate-400 text-sm">尚無跨 ETF 共識資料</div>
            </div>
        );
    }

    const chartData = data.map(row => ({
        date: row.date.substring(5), // MM-DD
        _full: row.date,
        total: row.total,
        ...(mode === 'pct'
            ? { pct2: row.pct2, pct3: row.pct3, pct5: row.pct5, pct7: row.pct7 }
            : { shared2: row.shared2, shared3: row.shared3, shared5: row.shared5, shared7: row.shared7 }
        ),
    }));

    const latest = data[data.length - 1];

    return (
        <div className="glass-card rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                        共識持股趨勢 — {totalEtfs} 支 ETF
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">各日期中，被多家 ETF 同時持有的股票比例</p>
                </div>
                <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setMode('pct')}
                        className={`px-3 py-1.5 text-xs font-medium transition-colors ${mode === 'pct' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'}`}
                    >
                        佔比%
                    </button>
                    <button
                        onClick={() => setMode('count')}
                        className={`px-3 py-1.5 text-xs font-medium transition-colors ${mode === 'count' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'}`}
                    >
                        股票數
                    </button>
                </div>
            </div>

            {/* 最新統計卡片 */}
            {latest && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {SERIES.map(s => {
                        const pct = latest[s.key as keyof typeof latest] as number;
                        const count = latest[s.countKey as keyof typeof latest] as number;
                        return (
                            <div key={s.key} className="rounded-xl p-3 text-center" style={{ backgroundColor: s.color + '15', border: `1px solid ${s.color}40` }}>
                                <div className="text-lg font-bold" style={{ color: s.color }}>
                                    {mode === 'pct' ? `${pct}%` : count}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</div>
                            </div>
                        );
                    })}
                </div>
            )}

            <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                        {SERIES.map(s => (
                            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={s.color} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={s.color} stopOpacity={0.02} />
                            </linearGradient>
                        ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.08} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                        width={35}
                        tickFormatter={v => mode === 'pct' ? `${v}%` : `${v}`}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: 'rgba(255,255,255,0.97)', borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '12px' }}
                        formatter={(v: number, name: string) => [mode === 'pct' ? `${v}%` : `${v} 支`, name]}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    {SERIES.map(s => {
                        const dataKey = mode === 'pct' ? s.key : s.countKey;
                        return (
                            <Area
                                key={s.key}
                                type="monotone"
                                dataKey={dataKey}
                                name={s.label}
                                stroke={s.color}
                                strokeWidth={2}
                                fill={`url(#grad-${s.key})`}
                            />
                        );
                    })}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
