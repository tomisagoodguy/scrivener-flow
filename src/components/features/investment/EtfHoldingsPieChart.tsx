'use client';

import React, { useState } from 'react';
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

// 10 colours: avoids red/green to not conflict with Taiwan gain/loss convention
const COLORS = [
    '#6366f1', // indigo-500
    '#8b5cf6', // violet-500
    '#a855f7', // purple-500
    '#ec4899', // pink-500
    '#f97316', // orange-500
    '#eab308', // yellow-500
    '#14b8a6', // teal-500
    '#06b6d4', // cyan-500
    '#3b82f6', // blue-500
    '#64748b', // slate-500
];
const OTHERS_COLOR = '#94a3b8'; // slate-400

export interface PieHolding {
    code: string;
    name: string;
    weight_pct: number;
}

interface SliceItem extends PieHolding {
    color: string;
}

export function aggregateTopHoldings(holdings: PieHolding[]): PieHolding[] {
    const sorted = [...holdings].sort((a, b) => b.weight_pct - a.weight_pct);
    if (sorted.length <= 10) return sorted;

    const top10 = sorted.slice(0, 10);
    const othersSum = sorted
        .slice(10)
        .reduce((acc, h) => acc + h.weight_pct, 0);

    return [
        ...top10,
        { code: '其他', name: '其他', weight_pct: Math.round(othersSum * 100) / 100 },
    ];
}

interface TooltipPayload {
    payload?: SliceItem;
}

function HoldingsTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
    if (!active || !payload?.length) return null;
    const item = payload[0]?.payload;
    if (!item) return null;

    const label =
        item.code === '其他'
            ? `其他 · 權重 ${item.weight_pct.toFixed(2)}%`
            : `${item.code} · ${item.name} · 權重 ${item.weight_pct.toFixed(2)}%`;

    return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-xs shadow-md text-slate-700 dark:text-slate-300">
            {label}
        </div>
    );
}

interface Props {
    holdings: PieHolding[];
}

export function EtfHoldingsPieChart({ holdings }: Props) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    if (!holdings.length) return null;

    const data: SliceItem[] = aggregateTopHoldings(holdings).map((h, i) => ({
        ...h,
        name: h.code === '其他' ? '其他' : `${h.code} ${h.name}`,
        color: h.code === '其他' ? OTHERS_COLOR : COLORS[i % COLORS.length],
    }));

    return (
        <div className="glass-card rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                前十大持股權重分佈
            </h3>
            <div className="flex flex-col md:flex-row gap-4 items-center">
                <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey="weight_pct"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={90}
                            strokeWidth={1}
                            stroke="#fff"
                            onMouseEnter={(_, index) => setActiveIndex(index)}
                            onMouseLeave={() => setActiveIndex(null)}
                        >
                            {data.map((entry, index) => (
                                <Cell
                                    key={entry.code}
                                    fill={entry.color}
                                    opacity={
                                        activeIndex === null || activeIndex === index
                                            ? 1
                                            : 0.6
                                    }
                                />
                            ))}
                        </Pie>
                        <Tooltip content={<HoldingsTooltip />} />
                    </PieChart>
                </ResponsiveContainer>

                {/* Legend */}
                <ul className="grid grid-cols-2 md:grid-cols-1 gap-1 text-xs min-w-0 w-full md:w-48 shrink-0">
                    {data.map((item, i) => (
                        <li
                            key={item.code}
                            className={`flex items-center gap-1.5 truncate transition-opacity ${
                                activeIndex === null || activeIndex === i
                                    ? 'opacity-100'
                                    : 'opacity-40'
                            }`}
                            onMouseEnter={() => setActiveIndex(i)}
                            onMouseLeave={() => setActiveIndex(null)}
                        >
                            <span
                                className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                                style={{ backgroundColor: item.color }}
                            />
                            <span className="truncate text-slate-600 dark:text-slate-400">
                                {item.code === '其他'
                                    ? `其他 ${item.weight_pct.toFixed(1)}%`
                                    : `${item.name} ${item.weight_pct.toFixed(1)}%`}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
