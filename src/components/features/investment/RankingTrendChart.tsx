'use client';

import React, { useMemo, useState } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';

interface RankingDataRow {
    data_date: string;
    stock_code: string;
    stock_name: string;
    weight: number;
    rank?: number | null;
}

interface RankingTrendChartProps {
    data: RankingDataRow[];
}

const TOP_N_OPTIONS = [
    { label: 'Top5', value: 5 },
    { label: 'Top10', value: 10 },
    { label: 'Top15', value: 15 },
    { label: '全部', value: Infinity },
] as const;

export function RankingTrendChart({ data }: RankingTrendChartProps) {
    const [topN, setTopN] = useState<number>(10);

    const colors = [
        '#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6',
        '#06b6d4', '#ec4899', '#f97316', '#14b8a6', '#64748b',
        '#a855f7', '#84cc16', '#ef4444', '#0ea5e9', '#d97706',
    ];

    const { chartData, latestRankings, latestDateStr, topStockNames } = useMemo(() => {
        if (!data || data.length === 0) return { chartData: [], latestRankings: [], latestDateStr: '', topStockNames: [] };

        const normalizeDate = (d: unknown) => String(d ?? '').substring(0, 10);
        const hasPrecomputedRank = data.some(d => d.rank != null);

        const raw = data.map(d => ({
            ...d,
            data_date: normalizeDate(d.data_date),
            stock_code: String(d.stock_code).trim(),
            stock_name: String(d.stock_name).trim(),
            weight: Number(d.weight) || 0,
        }));

        // Validate dates have enough holdings
        const dateCounts = raw.reduce((acc, curr) => {
            acc[curr.data_date] = (acc[curr.data_date] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const validDates = Object.keys(dateCounts).filter(d => dateCounts[d] >= 5).sort();
        if (validDates.length === 0) return { chartData: [], latestRankings: [], latestDateStr: '', topStockNames: [] };

        const latestDate = validDates[validDates.length - 1];
        const validData = raw.filter(d => validDates.includes(d.data_date));

        // Latest date holdings, sorted by rank or weight
        const latestDayData = validData.filter(d => d.data_date === latestDate);
        const latestSorted = hasPrecomputedRank
            ? [...latestDayData].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
            : [...latestDayData].sort((a, b) => b.weight - a.weight);

        const limit = topN === Infinity ? latestSorted.length : topN;
        const topStocks = latestSorted.slice(0, limit).map((d, i) => ({
            rank: hasPrecomputedRank ? (d.rank ?? i + 1) : i + 1,
            code: d.stock_code,
            name: d.stock_name,
            weight: d.weight,
        }));

        const names = topStocks.map(d => d.name);

        // Build chart data for all valid dates
        const result = validDates.map(date => {
            const dayData = validData.filter(d => d.data_date === date);
            const daySorted = hasPrecomputedRank
                ? [...dayData].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
                : [...dayData].sort((a, b) => b.weight - a.weight);

            const point: Record<string, string | number | null> = {
                date: date.substring(5),
                _fullDate: date,
            };

            topStocks.forEach(stock => {
                if (hasPrecomputedRank) {
                    const found = daySorted.find(d => d.stock_code === stock.code);
                    point[stock.name] = found?.rank ?? null;
                } else {
                    const rankIndex = daySorted.findIndex(d => d.stock_code === stock.code);
                    point[stock.name] = rankIndex >= 0 ? rankIndex + 1 : null;
                }
            });

            return point;
        });

        if (result.length === 1) {
            return {
                chartData: [{ ...result[0], date: '起始' }, result[0]],
                latestRankings: topStocks,
                latestDateStr: latestDate,
                topStockNames: names,
            };
        }

        return { chartData: result, latestRankings: topStocks, latestDateStr: latestDate, topStockNames: names };
    }, [data, topN]);

    if (!chartData || chartData.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
                <div className="h-[280px] w-full flex items-center justify-center text-slate-400">
                    尚無足夠排名的歷史數據
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
                    持股排名走勢
                    <span className="text-[10px] font-normal text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded ml-2">
                        (排名越小表現越佳)
                    </span>
                </h3>

                {/* Top N 篩選 tab */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                    {TOP_N_OPTIONS.map(opt => (
                        <button
                            key={opt.label}
                            onClick={() => setTopN(opt.value)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                                topN === opt.value
                                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Chart Section */}
                <div className="lg:col-span-3 h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                                axisLine={false}
                                tickLine={false}
                                interval={0}
                                padding={{ left: 10, right: 10 }}
                            />
                            <YAxis
                                reversed
                                domain={[1, 'auto']}
                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                                axisLine={false}
                                tickLine={false}
                                width={25}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                    borderRadius: '12px',
                                    border: 'none',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                    fontSize: '12px'
                                }}
                            />
                            <Legend
                                verticalAlign="top"
                                align="right"
                                iconType="circle"
                                wrapperStyle={{ fontSize: '10px', paddingBottom: '20px' }}
                            />
                            {topStockNames.map((name, index) => (
                                <Line
                                    key={name}
                                    type="monotone"
                                    dataKey={name}
                                    stroke={colors[index % colors.length]}
                                    strokeWidth={3}
                                    dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                    connectNulls
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Ranking List Section */}
                <div className="lg:col-span-1 border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-slate-800 pt-4 lg:pt-0 lg:pl-6">
                    <div className="mb-3 flex items-baseline justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            最新排名
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                            {latestDateStr}
                        </span>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                        {latestRankings.map((stock, index) => (
                            <div
                                key={stock.code}
                                className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm"
                                        style={{ backgroundColor: colors[index % colors.length] }}
                                    >
                                        {stock.rank}
                                    </div>
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                        {stock.name}
                                    </span>
                                </div>
                                <span className="text-xs font-mono text-slate-400">
                                    {stock.code}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
