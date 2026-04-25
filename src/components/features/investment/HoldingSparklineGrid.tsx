'use client';

import React, { useMemo, useState } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import type { RankingDataRow } from './RankingTrendChart';

type SortBy = 'weight' | 'peak' | 'days';
type TimeRange = '3m' | '6m' | 'all';

interface HoldingSparklineGridProps {
    data: RankingDataRow[];
    timeRange: TimeRange;
}

interface CardData {
    code: string;
    name: string;
    currentWeight: number;
    peakWeight: number;
    trackingDays: number;
    currentRank: number | null;
    sparkData: { date: string; weight: number }[];
}

export function HoldingSparklineGrid({ data, timeRange }: HoldingSparklineGridProps) {
    const [sortBy, setSortBy] = useState<SortBy>('weight');

    const cards = useMemo<CardData[]>(() => {
        // Filter by time range
        const filtered = (() => {
            if (timeRange === 'all') return data;
            const days = timeRange === '3m' ? 90 : 180;
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - days);
            const cutoffStr = cutoff.toISOString().slice(0, 10);
            return data.filter(r => r.data_date >= cutoffStr);
        })();

        // Compute ranks from the latest date in filtered data
        const dateWeights: Record<string, { code: string; weight: number }[]> = {};
        for (const row of filtered) {
            if (!dateWeights[row.data_date]) dateWeights[row.data_date] = [];
            dateWeights[row.data_date].push({ code: row.stock_code, weight: row.weight });
        }
        const latestDate = Object.keys(dateWeights).sort().pop() ?? '';
        const latestRankMap: Record<string, number> = {};
        if (latestDate && dateWeights[latestDate]) {
            [...dateWeights[latestDate]]
                .sort((a, b) => b.weight - a.weight)
                .forEach((r, i) => { latestRankMap[r.code] = i + 1; });
        }

        // Group by stock_code
        const grouped: Record<string, RankingDataRow[]> = {};
        for (const row of filtered) {
            if (!grouped[row.stock_code]) grouped[row.stock_code] = [];
            grouped[row.stock_code].push(row);
        }

        const result: CardData[] = Object.entries(grouped).map(([code, rows]) => {
            const sorted = [...rows].sort((a, b) => a.data_date.localeCompare(b.data_date));
            const latestRow = sorted[sorted.length - 1];
            return {
                code,
                name: latestRow?.stock_name ?? code,
                currentWeight: latestRow?.weight ?? 0,
                peakWeight: Math.max(...rows.map(r => r.weight)),
                trackingDays: new Set(rows.map(r => r.data_date)).size,
                currentRank: latestRankMap[code] ?? null,
                sparkData: sorted.map(r => ({ date: r.data_date, weight: r.weight })),
            };
        });

        result.sort((a, b) => {
            if (sortBy === 'peak') return b.peakWeight - a.peakWeight;
            if (sortBy === 'days') return b.trackingDays - a.trackingDays;
            return b.currentWeight - a.currentWeight;
        });

        return result;
    }, [data, timeRange, sortBy]);

    if (cards.length === 0) {
        return (
            <div className="glass-card rounded-2xl p-12 text-center text-slate-400">
                <p>無歷史比重資料</p>
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center gap-2 mb-4">
                <span className="text-xs text-slate-500">排序：</span>
                {([
                    { key: 'weight' as SortBy, label: '依比重' },
                    { key: 'peak' as SortBy, label: '依 Peak' },
                    { key: 'days' as SortBy, label: '依追蹤天數' },
                ] as const).map(opt => (
                    <button
                        key={opt.key}
                        onClick={() => setSortBy(opt.key)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                            sortBy === opt.key
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {cards.map(card => (
                    <SparklineCard key={card.code} {...card} />
                ))}
            </div>
        </div>
    );
}

function SparklineCard({ code, name, currentWeight, peakWeight, trackingDays, currentRank, sparkData }: CardData) {
    return (
        <div className="glass-card rounded-xl p-3 flex flex-col gap-1.5">
            <div className="flex items-start justify-between">
                <div>
                    <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{code}</span>
                    {currentRank != null && (
                        <span className="ml-1.5 text-[10px] text-slate-400">#{currentRank}</span>
                    )}
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {currentWeight.toFixed(2)}%
                </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate leading-tight">{name}</p>
            <div className="h-14 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparkData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                        <defs>
                            <linearGradient id={`spark-grad-${code}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Area
                            type="monotone"
                            dataKey="weight"
                            stroke="#6366f1"
                            strokeWidth={1.5}
                            fill={`url(#spark-grad-${code})`}
                            dot={false}
                            connectNulls
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>峰值 {peakWeight.toFixed(2)}%</span>
                <span>{trackingDays}天</span>
            </div>
        </div>
    );
}
