'use client';

import React, { useMemo } from 'react';
import {
    ComposedChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    ReferenceArea,
} from 'recharts';
import { Activity } from 'lucide-react';
import type { PremiumPoint } from '@/app/actions/getEtfMechanics';

interface PremiumDiscountChartProps {
    series: PremiumPoint[];
    navConnected: boolean;
}

/** 折溢價走勢圖：±1% 參考帶，正溢價 rose / 折價 emerald（台股紅漲綠跌）。 */
export function PremiumDiscountChart({ series, navConnected }: PremiumDiscountChartProps) {
    const chartData = useMemo(
        () =>
            series
                .filter((p) => p.premiumPct !== null)
                .map((p) => ({
                    date: p.date.slice(5),
                    premium: p.premiumPct as number,
                    premiumPos: Math.max(p.premiumPct as number, 0),
                    premiumNeg: Math.min(p.premiumPct as number, 0),
                    close: p.close,
                    nav: p.nav,
                })),
        [series]
    );

    return (
        <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-indigo-500" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">折溢價走勢</h3>
                <span className="text-xs text-slate-400">（市價 − NAV）/ NAV，±1% 參考帶</span>
            </div>
            {!navConnected || chartData.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                    <p className="font-medium">NAV 來源未接</p>
                    <p className="mt-1 text-xs">此 ETF 的發行商官網尚未提供可驗證的每日淨值欄位，無法計算折溢價（不以估計值代替）。</p>
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={280}>
                    <ComposedChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={40} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} domain={['auto', 'auto']} />
                        <Tooltip
                            formatter={(value: unknown, name?: string) => [`${Number(value ?? 0).toFixed(2)}%`, name === '折價' ? '折價' : '溢價']}
                            labelFormatter={(label: unknown) => `日期 ${String(label ?? '')}`}
                        />
                        <ReferenceArea y1={-1} y2={1} fill="#94a3b8" fillOpacity={0.12} />
                        <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1} />
                        <ReferenceLine y={1} stroke="#f43f5e" strokeDasharray="4 4" strokeOpacity={0.5} />
                        <ReferenceLine y={-1} stroke="#10b981" strokeDasharray="4 4" strokeOpacity={0.5} />
                        <Area type="monotone" dataKey="premiumPos" name="溢價" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.25} strokeWidth={1.5} isAnimationActive={false} />
                        <Area type="monotone" dataKey="premiumNeg" name="折價" stroke="#10b981" fill="#10b981" fillOpacity={0.25} strokeWidth={1.5} isAnimationActive={false} />
                    </ComposedChart>
                </ResponsiveContainer>
            )}
            <p className="mt-2 text-xs text-slate-400">正溢價（紅）＝市價高於淨值，申購套利壓力；折價（綠）＝市價低於淨值。NAV 缺漏日不計算。</p>
        </div>
    );
}
