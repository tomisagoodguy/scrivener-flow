'use client';

import React, { useMemo } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import { Layers } from 'lucide-react';
import type { DecompositionPoint, MechanicsAggregates } from '@/lib/investment/mechanicsUtils';

const APPROX_NOTE = '近似公式：units 由 AUM/NAV 推算；申購 = Δunits × NAV、市值貢獻 = units × ΔNAV';

interface DecompositionPanelProps {
    decomposition: DecompositionPoint[];
    aggregates: MechanicsAggregates;
}

function KpiTile({ label, value, tone }: { label: string; value: string; tone?: 'up' | 'down' }) {
    const toneClass =
        tone === 'up'
            ? 'text-rose-600 dark:text-rose-400'
            : tone === 'down'
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-slate-800 dark:text-slate-200';
    return (
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 px-4 py-3" title={APPROX_NOTE}>
            <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
            <div className={`mt-1 text-lg font-bold ${toneClass}`}>{value}</div>
        </div>
    );
}

/** AUM 成長拆解：累計申購 vs 市值貢獻堆疊圖 + 4 KPI（tooltip 註明近似公式）。 */
export function DecompositionPanel({ decomposition, aggregates }: DecompositionPanelProps) {
    const chartData = useMemo(
        () =>
            decomposition.map((p) => ({
                date: p.date.slice(5),
                累計申購: Number(p.cumInflow.toFixed(2)),
                累計市值貢獻: Number(p.cumMarketPnl.toFixed(2)),
            })),
        [decomposition]
    );

    return (
        <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
                <Layers className="w-5 h-5 text-violet-500" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">AUM 成長拆解</h3>
                <span className="text-xs text-slate-400" title={APPROX_NOTE}>申購送進來的 vs 漲出來的（近似值 ⓘ）</span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                <KpiTile label="成長倍數" value={aggregates.growthMult !== null ? `${aggregates.growthMult.toFixed(2)}x` : '—'} />
                <KpiTile
                    label="申購占成長比"
                    value={aggregates.inflowShareOfGrowth !== null ? `${(aggregates.inflowShareOfGrowth * 100).toFixed(1)}%` : '—'}
                />
                <KpiTile
                    label="最高單日申購"
                    value={aggregates.topInflowDay ? `${aggregates.topInflowDay.date.slice(5)}（+${aggregates.topInflowDay.value.toFixed(2)} 億）` : '—'}
                    tone={aggregates.topInflowDay ? 'up' : undefined}
                />
                <KpiTile
                    label="最大單日贖回"
                    value={aggregates.topOutflowDay ? `${aggregates.topOutflowDay.date.slice(5)}（${aggregates.topOutflowDay.value.toFixed(2)} 億）` : '—'}
                    tone={aggregates.topOutflowDay ? 'down' : undefined}
                />
            </div>
            {chartData.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">尚無拆解資料（需有 NAV 與流通單位序列）。</div>
            ) : (
                <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={40} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}億`} />
                        <Tooltip formatter={(value: unknown, name?: string) => [`${Number(value ?? 0).toFixed(2)} 億`, name ?? '']} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Area type="monotone" dataKey="累計申購" stackId="1" stroke="#6366f1" fill="#6366f1" fillOpacity={0.35} isAnimationActive={false} />
                        <Area type="monotone" dataKey="累計市值貢獻" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.35} isAnimationActive={false} />
                    </AreaChart>
                </ResponsiveContainer>
            )}
            <p className="mt-2 text-xs text-slate-400">{APPROX_NOTE}；申購占成長比 = 累計申購 / 總 AUM 成長。</p>
        </div>
    );
}
