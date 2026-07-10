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
import type { FuturesPositionPoint } from '@/app/actions/getMarketChips';

interface FuturesPositionChartProps {
    data: FuturesPositionPoint[];
}

const INSTITUTION_LABEL: Record<string, string> = {
    dealer: '自營商',
    trust: '投信',
    foreign: '外資',
};

// 三法人固定配色：外資紅（偏多主色）、投信橘、自營商灰藍
const INSTITUTION_COLOR: Record<string, string> = {
    foreign: '#e11d48',
    trust: '#f97316',
    dealer: '#64748b',
};

export function FuturesPositionChart({ data }: FuturesPositionChartProps) {
    const chartData = useMemo(() => {
        const dateMap = new Map<string, Record<string, number | string>>();
        for (const row of data) {
            if (!dateMap.has(row.data_date)) {
                dateMap.set(row.data_date, { date: row.data_date.slice(5) });
            }
            dateMap.get(row.data_date)![row.institution] = row.net_oi;
        }
        return Array.from(dateMap.values());
    }, [data]);

    if (chartData.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-slate-400">
                尚無期貨籌碼資料
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={30} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => v.toLocaleString()} />
                <Tooltip
                    formatter={(value: number | string | undefined, name: string | number | undefined) => {
                        const key = String(name ?? '');
                        return [Number(value ?? 0).toLocaleString(), INSTITUTION_LABEL[key] ?? key];
                    }}
                    labelFormatter={(label) => `📅 ${label}`}
                />
                <Legend
                    formatter={(value: string) => INSTITUTION_LABEL[value] ?? value}
                    wrapperStyle={{ fontSize: '12px' }}
                />
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                {(['foreign', 'trust', 'dealer'] as const).map((inst) => (
                    <Line
                        key={inst}
                        type="monotone"
                        dataKey={inst}
                        name={inst}
                        stroke={INSTITUTION_COLOR[inst]}
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                    />
                ))}
            </LineChart>
        </ResponsiveContainer>
    );
}
