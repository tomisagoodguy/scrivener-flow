'use client';

import React, { useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell,
    ReferenceLine
} from 'recharts';
import { DiffLog } from '@/types/investment';

interface StockTrendChartProps {
    code: string;
    logs: DiffLog[];
}

export function StockTrendChart({ code, logs }: StockTrendChartProps) {
    const data = useMemo(() => {
        // Get all unique dates from logs, sorted ascending
        const allDates = [...new Set(logs.map(l => l.data_date))].sort();
        // Take the last 5 days for trend context
        const recentDates = allDates.slice(-5);

        return recentDates.map(date => {
            const log = logs.find(l => l.stock_code === code && l.data_date === date);
            const val = Number(log?.diff_weight || 0);
            return {
                date: date.substring(5).replace('-', '/'), // MM/DD
                value: val,
                color: val > 0 ? '#f43f5e' : val < 0 ? '#10b981' : '#94a3b8'
            };
        });
    }, [code, logs]);

    if (data.length === 0) return null;

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10, fill: '#64748b' }} 
                    axisLine={false}
                    tickLine={false}
                />
                <YAxis 
                    tick={{ fontSize: 10, fill: '#64748b' }} 
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val: number) => `${val.toFixed(2)}`}
                />
                <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ 
                        borderRadius: '8px', 
                        border: 'none', 
                        fontSize: '12px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: unknown) => [`${Number(value) > 0 ? '+' : ''}${Number(value).toFixed(2)}%`, '權重變動']}
                />
                <ReferenceLine y={0} stroke="#e2e8f0" strokeDasharray="3 3" />
                <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}
