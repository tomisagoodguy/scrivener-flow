'use client';

import React, { useMemo } from 'react';
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

interface RankingData {
    date: string;
    [key: string]: string | number;
}

interface RankingTrendChartProps {
    data: any[];
}

export function RankingTrendChart({ data }: RankingTrendChartProps) {
    const colors = [
        '#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', 
        '#06b6d4', '#ec4899', '#f97316', '#14b8a6', '#64748b'
    ];

    const { chartData, latestRankings, latestDateStr, topStockNames } = useMemo(() => {
        if (!data || data.length === 0) return { chartData: [], latestRankings: [], latestDateStr: '', topStockNames: [] };

        const normalizeDate = (d: any) => String(d || '').substring(0, 10);
        
        const raw = data.map(d => ({
            ...d,
            data_date: normalizeDate(d.data_date),
            stock_code: String(d.stock_code).trim(),
            stock_name: String(d.stock_name).trim(),
            weight: Number(d.weight) || 0
        }));

        // Data Integrity Check
        const dateCounts = raw.reduce((acc, curr) => {
            acc[curr.data_date] = (acc[curr.data_date] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        // A valid snapshot needs enough holdings
        const validDates = Object.keys(dateCounts).filter(d => dateCounts[d] >= 5).sort();
        
        if (validDates.length === 0) return { chartData: [], latestRankings: [], latestDateStr: '', topStockNames: [] };
        
        const latestDate = validDates[validDates.length - 1];
        const validData = raw.filter(d => validDates.includes(d.data_date));

        // Latest Ranking Top 10
        const latestTop10 = validData
            .filter(d => d.data_date === latestDate)
            .sort((a, b) => b.weight - a.weight)
            .slice(0, 10)
            .map((d, i) => ({ 
                rank: i + 1,
                code: d.stock_code, 
                name: d.stock_name, 
                weight: d.weight 
            }));

        const names = latestTop10.map(d => d.name);

        // Build Chart Data History for *Current* Top 10
        const result = validDates.map(date => {
             const dayData = validData.filter(d => d.data_date === date);
             const daySorted = [...dayData].sort((a, b) => b.weight - a.weight);
             
             const point: any = { 
                 date: date.substring(5), 
                 _fullDate: date 
             };
             
             // Find historic rank for the current top 10 stocks
             latestTop10.forEach(stock => {
                 const rankIndex = daySorted.findIndex(d => d.stock_code === stock.code);
                 point[stock.name] = rankIndex >= 0 ? rankIndex + 1 : null;
             });
             
             return point;
        });

        // Mock points if only one data point exists
        if (result.length === 1) {
             const realPoint = result[0];
             const mockPoints = [
                  { ...realPoint, date: '起始' },
                  realPoint
             ];
             return { chartData: mockPoints, latestRankings: latestTop10, latestDateStr: latestDate, topStockNames: names };
        }

        return {
            chartData: result,
            latestRankings: latestTop10,
            latestDateStr: latestDate,
            topStockNames: names
        };

    }, [data]);

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
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
                    前十大持股排名走勢
                    <span className="text-[10px] font-normal text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded ml-2">
                        (排名越小表現越佳)
                    </span>
                </h3>
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
