'use client';

import React, { useMemo, useState } from 'react';
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import type { DiffLog, Holding } from '@/types/investment';

const COLORS = [
    '#6366f1',
    '#8b5cf6',
    '#a855f7',
    '#ec4899',
    '#f97316',
];
const OTHERS_COLOR = '#94a3b8';

export interface BuySlice {
    code: string;
    name: string;
    capital: number; // in 億
    color: string;
}

export function aggregateBuyCapital(
    diffLogs: DiffLog[],
    holdings: Holding[]
): BuySlice[] {
    const priceMap = new Map(holdings.map(h => [h.stock_code, h.price]));

    const buyEvents = diffLogs.filter(
        d => d.change_type === 'BUY' || d.change_type === 'IN'
    );

    const items: BuySlice[] = buyEvents
        .map(d => {
            const price = priceMap.get(d.stock_code);
            if (!price || price <= 0) return null;
            const capital = (Math.abs(d.diff_shares) * price) / 1e8;
            return {
                code: d.stock_code,
                name: d.stock_name,
                capital,
                color: '',
            };
        })
        .filter((item): item is BuySlice => item !== null)
        .sort((a, b) => b.capital - a.capital);

    if (items.length === 0) return [];
    if (items.length <= 5) {
        return items.map((item, i) => ({ ...item, color: COLORS[i % COLORS.length] }));
    }

    const top5 = items.slice(0, 5).map((item, i) => ({
        ...item,
        color: COLORS[i],
    }));
    const othersCapital = items.slice(5).reduce((acc, i) => acc + i.capital, 0);

    return [
        ...top5,
        { code: '其他', name: '其他', capital: othersCapital, color: OTHERS_COLOR },
    ];
}

interface TooltipPayload {
    payload?: BuySlice & { totalCapital: number };
}

function DonutTooltip({
    active,
    payload,
}: {
    active?: boolean;
    payload?: TooltipPayload[];
}) {
    if (!active || !payload?.length) return null;
    const item = payload[0]?.payload;
    if (!item) return null;

    const totalCapital = item.totalCapital ?? 0;
    const pct = totalCapital > 0 ? (item.capital / totalCapital) * 100 : 0;

    const label =
        item.code === '其他'
            ? `其他 · ${item.capital.toFixed(2)}億 · ${pct.toFixed(1)}%`
            : `${item.code} ${item.name} · ${item.capital.toFixed(2)}億 · ${pct.toFixed(1)}%`;

    return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-xs shadow-md text-slate-700 dark:text-slate-300">
            {label}
        </div>
    );
}

interface Props {
    diffLogs: DiffLog[];
    holdings: Holding[];
    prevDiffLogs?: DiffLog[];
    dataDate?: string;
    prevDataDate?: string;
}

const fmtDate = (d?: string) => d ? d.slice(5).replace('-', '/') : '';

export function EtfBuyDonutChart({ diffLogs, holdings, prevDiffLogs, dataDate, prevDataDate }: Props) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    const priceMap = useMemo(
        () => new Map(holdings.map(h => [h.stock_code, h.price])),
        [holdings]
    );

    const data = useMemo(
        () => aggregateBuyCapital(diffLogs, holdings),
        [diffLogs, holdings]
    );

    // Yesterday's buy capital per stock, computed at today's prices for fair comparison
    const prevCapitalMap = useMemo(() => {
        if (!prevDiffLogs?.length) return new Map<string, number>();
        const map = new Map<string, number>();
        for (const d of prevDiffLogs) {
            if (d.change_type !== 'BUY' && d.change_type !== 'IN') continue;
            const price = priceMap.get(d.stock_code);
            if (!price || price <= 0) continue;
            map.set(d.stock_code, (Math.abs(d.diff_shares) * price) / 1e8);
        }
        return map;
    }, [prevDiffLogs, priceMap]);

    const hasPrevData = prevCapitalMap.size > 0;

    if (data.length === 0) {
        return (
            <div className="glass-card rounded-2xl p-4 text-center text-slate-400 text-sm">
                今日無買進紀錄
            </div>
        );
    }

    const totalCapital = data.reduce((acc, d) => acc + d.capital, 0);
    const chartData = data.map(d => ({ ...d, totalCapital }));

    return (
        <div className="glass-card rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    今日買進資金佔比
                </h3>
                {hasPrevData && (
                    <div className="flex items-center gap-1.5 text-xs">
                        <span className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded font-mono">
                            今 {fmtDate(dataDate)}
                        </span>
                        <span className="text-slate-400">vs</span>
                        <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded font-mono">
                            昨 {fmtDate(prevDataDate)}
                        </span>
                    </div>
                )}
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center">
                <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                        <Pie
                            data={chartData}
                            dataKey="capital"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            strokeWidth={1}
                            stroke="#fff"
                            onMouseEnter={(_, index) => setActiveIndex(index)}
                            onMouseLeave={() => setActiveIndex(null)}
                        >
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={entry.code}
                                    fill={entry.color}
                                    opacity={activeIndex === null || activeIndex === index ? 1 : 0.6}
                                />
                            ))}
                        </Pie>
                        <Tooltip content={<DonutTooltip />} />
                        <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle">
                            <tspan x="50%" fontSize="15" fontWeight="700" fill="#4f46e5">
                                {totalCapital.toFixed(1)}億
                            </tspan>
                        </text>
                        <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle">
                            <tspan x="50%" fontSize="10" fill="#94a3b8">
                                買進總額
                            </tspan>
                        </text>
                    </PieChart>
                </ResponsiveContainer>

                <ul className="flex flex-col gap-2 text-xs min-w-0 w-full md:w-60 shrink-0">
                    {data.map((item, i) => {
                        const pct = totalCapital > 0 ? (item.capital / totalCapital) * 100 : 0;
                        const prevCap = prevCapitalMap.get(item.code);
                        const delta = prevCap != null ? item.capital - prevCap : null;
                        const isNew = hasPrevData && prevCap == null && item.code !== '其他';

                        return (
                            <li
                                key={item.code}
                                className={`flex items-center gap-1.5 transition-opacity ${
                                    activeIndex === null || activeIndex === i ? 'opacity-100' : 'opacity-40'
                                }`}
                                onMouseEnter={() => setActiveIndex(i)}
                                onMouseLeave={() => setActiveIndex(null)}
                            >
                                <span
                                    className="inline-block w-2.5 h-2.5 rounded-sm shrink-0 mt-px"
                                    style={{ backgroundColor: item.color }}
                                />
                                <span className="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                                    {item.code}
                                </span>
                                {item.code !== '其他' && (
                                    <span className="text-slate-500 dark:text-slate-400 truncate">
                                        {item.name}
                                    </span>
                                )}
                                <span className="ml-auto font-medium text-slate-700 dark:text-slate-200 shrink-0">
                                    {pct.toFixed(1)}%
                                </span>
                                {isNew && (
                                    <span className="px-1 py-px bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded text-[10px] font-bold shrink-0">
                                        新
                                    </span>
                                )}
                                {delta != null && (
                                    <span className={`text-[10px] font-semibold shrink-0 ${
                                        delta > 0.05
                                            ? 'text-rose-500 dark:text-rose-400'
                                            : delta < -0.05
                                                ? 'text-emerald-600 dark:text-emerald-400'
                                                : 'text-slate-400'
                                    }`}>
                                        {delta > 0.05 ? '↑' : delta < -0.05 ? '↓' : '→'}
                                        {Math.abs(delta) >= 0.05 ? `${Math.abs(delta).toFixed(1)}億` : '持平'}
                                    </span>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
}
