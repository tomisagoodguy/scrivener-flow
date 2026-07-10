'use client';

import React, { useMemo } from 'react';
import {
    ComposedChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import type { MarginBalancePoint } from '@/app/actions/getMarketChips';

interface MarginBalanceChartProps {
    data: MarginBalancePoint[];
}

export function MarginBalanceChart({ data }: MarginBalanceChartProps) {
    const chartData = useMemo(
        () =>
            data.map((row) => ({
                date: row.data_date.slice(5),
                marginBalance: row.margin_balance,
                shortBalance: row.short_balance,
            })),
        [data],
    );

    if (chartData.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-slate-400">
                尚無融資融券資料
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={chartData} margin={{ top: 10, right: 40, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={30} />
                <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: number) => `${(v / 1_000_000).toFixed(0)}億`}
                    label={{ value: '融資餘額（仟元）', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
                />
                <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: number) => v.toLocaleString()}
                    label={{ value: '融券餘額（張）', angle: 90, position: 'insideRight', style: { fontSize: 11 } }}
                />
                <Tooltip
                    formatter={(value: number | string | undefined, name: string | number | undefined) => {
                        const numVal = Number(value ?? 0).toLocaleString();
                        if (name === 'marginBalance') return [numVal, '融資餘額（仟元）'];
                        if (name === 'shortBalance') return [numVal, '融券餘額（張）'];
                        return [numVal, String(name ?? '')];
                    }}
                    labelFormatter={(label) => `📅 ${label}`}
                />
                <Legend
                    formatter={(value: string) =>
                        value === 'marginBalance' ? '融資餘額' : value === 'shortBalance' ? '融券餘額' : value
                    }
                    wrapperStyle={{ fontSize: '12px' }}
                />
                <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="marginBalance"
                    name="marginBalance"
                    stroke="#e11d48"
                    strokeWidth={2}
                    dot={false}
                />
                <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="shortBalance"
                    name="shortBalance"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                />
            </ComposedChart>
        </ResponsiveContainer>
    );
}
