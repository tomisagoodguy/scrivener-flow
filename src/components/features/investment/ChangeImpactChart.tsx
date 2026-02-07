'use client';

import React, { useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    ReferenceLine,
} from 'recharts';
import { StockWeightSidebar } from './StockWeightSidebar';
import { List } from 'lucide-react';

interface ImpactData {
    name: string;
    impact: number;
    color: string;
}

interface ChangeImpactChartProps {
    logs: any[];
}

export function ChangeImpactChart({ logs }: ChangeImpactChartProps) {
    const [timeRange, setTimeRange] = React.useState<'1D' | '3D' | '5D'>('1D');

    const impactData = useMemo(() => {
        if (!logs || logs.length === 0) return [];

        // 1. Get all unique dates sorted descending (latest first)
        const uniqueDates = [...new Set(logs.map(l => l.data_date))].sort().reverse();

        // 2. Determine how many days to look back
        const daysToTake = timeRange === '1D' ? 1 : timeRange === '3D' ? 3 : 5;
        const targetDates = uniqueDates.slice(0, daysToTake);

        // 3. Filter logs for these dates
        const targetLogs = logs.filter(l => targetDates.includes(l.data_date));

        // 4. Aggregate diff_weight by stock_code
        // 同一檔股票在多天內的變動需累加
        const aggregatedMap = targetLogs.reduce<Record<string, { name: string; impact: number }>>(
            (acc, log) => {
                const code = log.stock_code;
                const prev = acc[code]?.impact ?? 0;
                // Accumulate the diff_weight (ensure to handle strings/numbers safely)
                const weightChange = Number(log.diff_weight) || 0;
                
                acc[code] = {
                    name: log.stock_name, // assumption: name is constant
                    impact: prev + weightChange,
                };
                return acc;
            },
            {}
        );

        const aggregated = Object.values(aggregatedMap);

        // 5. Sort by absolute impact and take top 10
        return aggregated
            .map(item => ({
                name: item.name,
                impact: item.impact,
                color: item.impact > 0 ? '#f43f5e' : '#10b981',
            }))
            .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
            .slice(0, 10);
    }, [logs, timeRange]);

    if (!logs || logs.length === 0) return null;

    return (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-rose-500 rounded-full"></div>
                    資金影響力排行 (近 {timeRange.replace('D', ' 日')})
                    <span className="text-[10px] font-normal text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded ml-2">
                        (累計權重增減 %)
                    </span>
                </h3>
                <div className="flex items-center gap-2">
                    <StockWeightSidebar logs={logs}>
                        <button className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-slate-500 hover:text-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                            <List className="w-3.5 h-3.5" />
                            完整明細
                        </button>
                    </StockWeightSidebar>
                    
                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>

                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                        {(['1D', '3D', '5D'] as const).map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                                    timeRange === range
                                        ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                }`}
                            >
                                {range}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            
            <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={impactData}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.1} />
                        <XAxis type="number" hide />
                        <YAxis 
                            dataKey="name" 
                            type="category" 
                            tick={{ fontSize: 11, fill: '#64748b' }}
                            width={80}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                borderRadius: '12px',
                                border: 'none',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                fontSize: '12px'
                            }}
                            cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                            formatter={(value: any) => [`${Number(value) > 0 ? '+' : ''}${Number(value).toFixed(2)}%`, '權重變動']}
                        />
                        <ReferenceLine x={0} stroke="#cbd5e1" />
                        <Bar 
                            dataKey="impact" 
                            radius={[0, 4, 4, 0]}
                            barSize={16}
                        >
                            {impactData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
            {impactData.length === 0 && (
                 <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm pb-8">
                    暫無資料
                 </div>
            )}
        </div>
    );
}
