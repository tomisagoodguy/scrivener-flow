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
import { useStockWeightAnalysis, TimeRange } from './hooks/useStockWeightAnalysis';
import { DiffLog } from '@/types/investment';

interface ChangeImpactChartProps {
    logs: DiffLog[];
}

export function ChangeImpactChart({ logs }: ChangeImpactChartProps) {
    const [timeRange, setTimeRange] = React.useState<TimeRange>('1D');
    
    // Use shared hook
    const { processedData } = useStockWeightAnalysis(logs, timeRange);

    const impactData = useMemo(() => {
        // Take aggregated data from hook, transform for chart, sort by impact, take top 10
        return processedData
            .map(item => ({
                name: item.name,
                impact: item.impact,
                color: item.impact > 0 ? '#f43f5e' : '#10b981',
            }))
            .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
            .slice(0, 10);
    }, [processedData]);

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
                <ResponsiveContainer width="100%" height={280}>
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
                            formatter={(value: number | string | undefined) => [`${Number(value ?? 0) > 0 ? '+' : ''}${Number(value ?? 0).toFixed(2)}%`, '權重變動']}
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
