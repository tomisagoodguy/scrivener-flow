'use client';

import React, { useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceLine,
} from 'recharts';
import type { RetailRatioPoint } from '@/app/actions/getMarketChips';

interface RetailRatioChartProps {
    data: RetailRatioPoint[];
}

const CONTRACT_LABEL: Record<string, string> = {
    MXF: '小台',
    TMF: '微台',
};

const CONTRACT_COLOR: Record<string, string> = {
    MXF: '#e11d48',
    TMF: '#0ea5e9',
};

export function RetailRatioChart({ data }: RetailRatioChartProps) {
    const chartData = useMemo(() => {
        const dateMap = new Map<string, Record<string, number | string>>();
        for (const row of data) {
            if (!dateMap.has(row.data_date)) {
                dateMap.set(row.data_date, { date: row.data_date.slice(5) });
            }
            dateMap.get(row.data_date)![row.contract] = row.retail_ls_ratio;
        }
        return Array.from(dateMap.values());
    }, [data]);

    if (chartData.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-slate-400">
                尚無散戶多空比資料
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={30} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v.toFixed(1)}%`} />
                <Tooltip
                    formatter={(value: number | string | undefined, name: string | number | undefined) => {
                        const key = String(name ?? '');
                        return [`${Number(value ?? 0).toFixed(2)}%`, CONTRACT_LABEL[key] ?? key];
                    }}
                    labelFormatter={(label) => `📅 ${label}`}
                />
                <Legend
                    formatter={(value: string) => CONTRACT_LABEL[value] ?? value}
                    wrapperStyle={{ fontSize: '12px' }}
                />
                <ReferenceLine y={0} stroke="#334155" strokeOpacity={0.6} />
                {(['MXF', 'TMF'] as const).map((contract) => (
                    <Line
                        key={contract}
                        type="monotone"
                        dataKey={contract}
                        name={contract}
                        stroke={CONTRACT_COLOR[contract]}
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                    />
                ))}
            </LineChart>
        </ResponsiveContainer>
    );
}
