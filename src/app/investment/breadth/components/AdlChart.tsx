'use client';

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import type { AdlRecord } from '@/app/actions/getAdlData';

interface Props {
    records: AdlRecord[];
}

function fmtDate(d: string): string {
    return d.slice(5); // MM-DD
}

function fmtNum(v: number | null | undefined): string {
    if (v === null || v === undefined) return '—';
    return v.toFixed(0);
}

const CHART_STYLE = {
    adl: '#6366f1',   // indigo
    ma5: '#f59e0b',   // amber
    ma60: '#ef4444',  // red
    adr: '#06b6d4',   // cyan
    adrMa5: '#f59e0b',
    adrMa60: '#ef4444',
};

export default function AdlChart({ records }: Props) {
    const adlData = records.map((r) => ({
        date: r.date,
        label: fmtDate(r.date),
        adl: r.adl,
        adl_ma5: r.adl_ma5,
        adl_ma60: r.adl_ma60,
    }));

    const adrData = records.map((r) => ({
        date: r.date,
        label: fmtDate(r.date),
        adr: r.adr !== null ? +(r.adr * 100).toFixed(2) : null,
        adr_ma5: r.adr_ma5 !== null ? +(r.adr_ma5 * 100).toFixed(2) : null,
        adr_ma60: r.adr_ma60 !== null ? +(r.adr_ma60 * 100).toFixed(2) : null,
    }));

    // Show every Nth tick to avoid crowding
    const tickEvery = Math.max(1, Math.floor(records.length / 12));
    const xTicks = adlData.filter((_, i) => i % tickEvery === 0).map((d) => d.label);

    return (
        <div className="space-y-4">
            {/* ADL chart */}
            <div className="glass-card p-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">騰落指標線（ADL）</p>
                <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={adlData} margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.3)" />
                        <XAxis
                            dataKey="label"
                            ticks={xTicks}
                            tick={{ fontSize: 11, fill: '#9ca3af' }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fontSize: 11, fill: '#9ca3af' }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={fmtNum}
                            width={60}
                        />
                        <Tooltip
                            formatter={(val, name) => [fmtNum(typeof val === 'number' ? val : null), name as string]}
                            labelFormatter={(l) => `日期：${l}`}
                            contentStyle={{ background: 'rgba(255,255,255,0.9)', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12 }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Line type="monotone" dataKey="adl" name="ADL" stroke={CHART_STYLE.adl} dot={false} strokeWidth={1.5} connectNulls />
                        <Line type="monotone" dataKey="adl_ma5" name="ADL MA5" stroke={CHART_STYLE.ma5} dot={false} strokeWidth={1.5} strokeDasharray="4 2" connectNulls />
                        <Line type="monotone" dataKey="adl_ma60" name="ADL MA60" stroke={CHART_STYLE.ma60} dot={false} strokeWidth={2} connectNulls />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* ADR chart */}
            <div className="glass-card p-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">騰落比率（ADR %）</p>
                <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={adrData} margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.3)" />
                        <XAxis
                            dataKey="label"
                            ticks={xTicks}
                            tick={{ fontSize: 11, fill: '#9ca3af' }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fontSize: 11, fill: '#9ca3af' }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) => `${v}%`}
                            width={52}
                        />
                        <Tooltip
                            formatter={(val, name) => [typeof val === 'number' ? `${val}%` : '—', name as string]}
                            labelFormatter={(l) => `日期：${l}`}
                            contentStyle={{ background: 'rgba(255,255,255,0.9)', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12 }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Line type="monotone" dataKey="adr" name="ADR" stroke={CHART_STYLE.adr} dot={false} strokeWidth={1.5} connectNulls />
                        <Line type="monotone" dataKey="adr_ma5" name="ADR MA5" stroke={CHART_STYLE.adrMa5} dot={false} strokeWidth={1.5} strokeDasharray="4 2" connectNulls />
                        <Line type="monotone" dataKey="adr_ma60" name="ADR MA60" stroke={CHART_STYLE.adrMa60} dot={false} strokeWidth={2} connectNulls />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
