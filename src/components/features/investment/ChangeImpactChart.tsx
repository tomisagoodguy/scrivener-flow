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

interface ImpactData {
    name: string;
    impact: number;
    color: string;
}

interface ChangeImpactChartProps {
    logs: any[];
}

export function ChangeImpactChart({ logs }: ChangeImpactChartProps) {
    const impactData = useMemo(() => {
        if (!logs || logs.length === 0) return [];

        // 取得最近日期的異動
        const latestDate = [...new Set(logs.map(l => l.data_date))].sort().pop();
        const latestLogs = logs.filter(l => l.data_date === latestDate);

        // 按權重變動絕對值排序，取前 10 名
        return latestLogs
            .map(log => ({
                name: log.stock_name,
                impact: log.diff_weight,
                color: log.diff_weight > 0 ? '#f43f5e' : '#10b981'
            }))
            .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
            .slice(0, 10);
    }, [logs]);

    if (impactData.length === 0) return null;

    return (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-rose-500 rounded-full"></div>
                    最新變動：資金影響力排行
                    <span className="text-[10px] font-normal text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded ml-2">
                        (權重增減百分點 %)
                    </span>
                </h3>
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
        </div>
    );
}
