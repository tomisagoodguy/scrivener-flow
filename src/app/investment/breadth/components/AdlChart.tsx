'use client';

import { useMemo } from 'react';
import {
    ComposedChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceArea,
    LineChart,
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
    return Math.round(v).toLocaleString();
}

interface Segment {
    x1: string;
    x2: string;
    bullish: boolean;
}

// 分出 MA5 > MA60（多頭）與 MA5 < MA60（空頭）區間
function computeSegments(records: AdlRecord[]): Segment[] {
    const segments: Segment[] = [];
    const filtered = records.filter(r => r.adl_ma5 !== null && r.adl_ma60 !== null);
    if (filtered.length < 2) return segments;

    let segStart = filtered[0];
    let currentBullish = (segStart.adl_ma5 ?? 0) >= (segStart.adl_ma60 ?? 0);

    for (let i = 1; i < filtered.length; i++) {
        const r = filtered[i];
        const bullish = (r.adl_ma5 ?? 0) >= (r.adl_ma60 ?? 0);
        if (bullish !== currentBullish) {
            segments.push({ x1: fmtDate(segStart.date), x2: fmtDate(filtered[i - 1].date), bullish: currentBullish });
            segStart = r;
            currentBullish = bullish;
        }
    }
    segments.push({ x1: fmtDate(segStart.date), x2: fmtDate(filtered[filtered.length - 1].date), bullish: currentBullish });
    return segments;
}

export default function AdlChart({ records }: Props) {
    const { segments, adlData, adrData, xTicks, latest, isBullish } = useMemo(() => {
        const segs = computeSegments(records);
        const adl = records.map((r) => ({
            label: fmtDate(r.date),
            adl: r.adl,
            adl_ma5: r.adl_ma5,
            adl_ma60: r.adl_ma60,
        }));
        const adr = records.map((r) => ({
            label: fmtDate(r.date),
            adr: r.adr !== null ? +(r.adr * 100).toFixed(2) : null,
            adr_ma5: r.adr_ma5 !== null ? +(r.adr_ma5 * 100).toFixed(2) : null,
            adr_ma60: r.adr_ma60 !== null ? +(r.adr_ma60 * 100).toFixed(2) : null,
        }));
        const tickEvery = Math.max(1, Math.floor(records.length / 10));
        const ticks = adl.filter((_, i) => i % tickEvery === 0).map((d) => d.label);
        const lat = records[records.length - 1];
        const bullish = lat?.adl_ma5 !== null && lat?.adl_ma60 !== null && (lat.adl_ma5 ?? 0) >= (lat.adl_ma60 ?? 0);
        return { segments: segs, adlData: adl, adrData: adr, xTicks: ticks, latest: lat, isBullish: bullish };
    }, [records]);

    return (
        <div className="space-y-4">
            {latest && (
                <div className="flex flex-wrap gap-4 px-1 text-sm">
                    <span className="text-gray-500">上漲 <strong className="text-rose-500">{latest.ups?.toLocaleString() ?? '—'}</strong> 家</span>
                    <span className="text-gray-500">下跌 <strong className="text-emerald-500">{latest.downs?.toLocaleString() ?? '—'}</strong> 家</span>
                    <span className="text-gray-500">淨差 <strong className={isBullish ? 'text-rose-500' : 'text-emerald-500'}>{latest.net !== null ? (latest.net > 0 ? '+' : '') + latest.net : '—'}</strong></span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isBullish ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                        {isBullish ? 'MA5 > MA60 多頭廣度' : 'MA5 < MA60 空頭廣度'}
                    </span>
                </div>
            )}

            <div className="glass-card p-4">
                <div className="mb-3">
                    <p className="text-base font-semibold text-gray-800 dark:text-gray-100">
                        騰落指標線（ADL · Advance-Decline Line）
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        累積（上漲家數 − 下跌家數），走勢向上 = 市場廣度健康；MA5 &gt; MA60 為多頭廣度
                    </p>
                    <p className="text-xs text-gray-400 mt-1.5">
                        <span className="inline-block w-2.5 h-2.5 rounded-sm bg-rose-400/40 mr-1" />紅色區間 MA5 &gt; MA60（廣度多頭）
                        <span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-400/40 mx-1 ml-3" />綠色區間 MA5 &lt; MA60（廣度空頭）
                    </p>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={adlData} margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.25)" />
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
                            width={64}
                        />
                        <Tooltip
                            formatter={(val, name) => [fmtNum(typeof val === 'number' ? val : null), name as string]}
                            labelFormatter={(l) => `日期：${l}`}
                            contentStyle={{ background: 'rgba(255,255,255,0.92)', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12 }}
                        />
                        {segments.map((seg) => (
                            <ReferenceArea
                                key={`${seg.x1}-${seg.x2}`}
                                x1={seg.x1}
                                x2={seg.x2}
                                fill={seg.bullish ? 'rgba(244,63,94,0.10)' : 'rgba(16,185,129,0.10)'}
                                stroke="none"
                            />
                        ))}
                        <Line type="monotone" dataKey="adl" name="ADL" stroke="#a5b4fc" dot={false} strokeWidth={1} connectNulls opacity={0.7} />
                        <Line type="monotone" dataKey="adl_ma5" name="MA5" stroke="#f43f5e" dot={false} strokeWidth={2} connectNulls />
                        <Line type="monotone" dataKey="adl_ma60" name="MA60" stroke="#10b981" dot={false} strokeWidth={2} connectNulls />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            <div className="glass-card p-4">
                <div className="mb-3">
                    <p className="text-base font-semibold text-gray-800 dark:text-gray-100">
                        騰落比率（ADR · Advance-Decline Ratio）
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        今日上漲家數 ÷（上漲 + 下跌）；&gt;50% 多頭格局，&lt;50% 空頭格局，極端值（&gt;80% 或 &lt;20%）可能反轉
                    </p>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={adrData} margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.25)" />
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
                            domain={[0, 100]}
                        />
                        <Tooltip
                            formatter={(val, name) => [typeof val === 'number' ? `${val}%` : '—', name as string]}
                            labelFormatter={(l) => `日期：${l}`}
                            contentStyle={{ background: 'rgba(255,255,255,0.92)', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12 }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Line type="monotone" dataKey="adr" name="ADR" stroke="#06b6d4" dot={false} strokeWidth={1.5} connectNulls />
                        <Line type="monotone" dataKey="adr_ma5" name="ADR MA5" stroke="#f59e0b" dot={false} strokeWidth={1.5} strokeDasharray="4 2" connectNulls />
                        <Line type="monotone" dataKey="adr_ma60" name="ADR MA60" stroke="#ef4444" dot={false} strokeWidth={2} connectNulls />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
