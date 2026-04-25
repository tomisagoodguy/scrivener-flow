'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ETF_REGISTRY } from '@/lib/investment/etfRegistry';

const REG_MAP = Object.fromEntries(
    ETF_REGISTRY.map(e => [e.code, { name: e.name, issuer: e.issuer, color: e.color }])
);

interface AumRow {
    etf_code: string;
    data_date: string;
    aum_100m: number;
    nav: number;
    units: number;
    inflow_100m: number | null;
}

interface EtfAumStats {
    etf_code: string;
    name: string;
    issuer: string;
    color: string;
    n_days: number;
    first_date: string;
    latest_date: string;
    aum_first: number;
    aum_current: number;
    growth_mult: number;
    inflow_cum: number;
    inflow_share: number;
    nav_current: number;
    units_current: number;
    top_inflow: { date: string; val: number } | null;
    top_outflow: { date: string; val: number } | null;
    series: { aum: number }[];
}

function buildStats(rows: AumRow[]): EtfAumStats[] {
    const grouped = new Map<string, AumRow[]>();
    for (const r of rows) {
        if (!grouped.has(r.etf_code)) grouped.set(r.etf_code, []);
        grouped.get(r.etf_code)!.push(r);
    }
    const result: EtfAumStats[] = [];
    for (const [code, etfRows] of grouped) {
        const sorted = [...etfRows].sort((a, b) => a.data_date.localeCompare(b.data_date));
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const inflow_cum = sorted.reduce((s, r) => s + (r.inflow_100m ?? 0), 0);
        const growth = last.aum_100m - first.aum_100m;
        const inflow_share = growth > 0.01 ? inflow_cum / growth : 0;
        let topIn: AumRow | null = null;
        let topOut: AumRow | null = null;
        for (const r of sorted) {
            if (r.inflow_100m == null) continue;
            if (!topIn || r.inflow_100m > topIn.inflow_100m!) topIn = r;
            if (!topOut || r.inflow_100m < topOut.inflow_100m!) topOut = r;
        }
        const meta = REG_MAP[code];
        result.push({
            etf_code: code,
            name: meta?.name ?? code,
            issuer: meta?.issuer ?? '',
            color: meta?.color ?? '#6366f1',
            n_days: sorted.length,
            first_date: first.data_date,
            latest_date: last.data_date,
            aum_first: first.aum_100m,
            aum_current: last.aum_100m,
            growth_mult: first.aum_100m > 0.01 ? last.aum_100m / first.aum_100m : 1,
            inflow_cum,
            inflow_share,
            nav_current: last.nav,
            units_current: last.units,
            top_inflow: topIn ? { date: topIn.data_date, val: topIn.inflow_100m! } : null,
            top_outflow: topOut && topOut.inflow_100m! < -0.01 ? { date: topOut.data_date, val: topOut.inflow_100m! } : null,
            series: sorted.map(r => ({ aum: r.aum_100m })),
        });
    }
    return result.sort((a, b) => b.aum_current - a.aum_current);
}

function Sparkline({ series, color }: { series: { aum: number }[]; color: string }) {
    if (series.length < 2) return <span className="text-xs text-slate-400">—</span>;
    const vals = series.map(s => s.aum);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    const W = 80, H = 28;
    const pts = vals.map((v, i) =>
        `${(i / (vals.length - 1)) * W},${H - ((v - min) / range) * (H - 2) - 1}`
    ).join(' ');
    return (
        <svg width={W} height={H} className="overflow-visible">
            <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function inflowColor(share: number) {
    if (share > 0.7) return 'text-rose-600 dark:text-rose-400 font-semibold';
    if (share < 0.3) return 'text-emerald-600 dark:text-emerald-400 font-semibold';
    return 'text-slate-700 dark:text-slate-300';
}

function inflowTooltip(share: number) {
    if (share > 0.7) return '申購占成長比偏高（>70%），規模增長主要靠申購資金，非淨值上漲';
    if (share < 0.3) return '申購占成長比偏低（<30%），規模增長主要來自淨值上漲';
    return `申購占成長比 ${(share * 100).toFixed(1)}%，申購與淨值上漲均衡`;
}

export function AumScalePanel() {
    const [stats, setStats] = useState<EtfAumStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    useEffect(() => {
        const supabase = createClient();
        supabase
            .from('etf_aum_series')
            .select('etf_code, data_date, aum_100m, nav, units, inflow_100m')
            .order('data_date', { ascending: true })
            .then(({ data }) => {
                if (data) setStats(buildStats(data as AumRow[]));
                setLoading(false);
            });
    }, []);

    function toggle(code: string) {
        setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(code)) next.delete(code); else next.add(code);
            return next;
        });
    }

    if (loading) return (
        <div className="glass-card rounded-2xl p-10 text-center text-slate-400 animate-pulse">載入 AUM 規模資料中…</div>
    );

    return (
        <div className="glass-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500 dark:text-slate-400">
                            <th className="px-4 py-3 text-left">代號</th>
                            <th className="px-4 py-3 text-left">名稱</th>
                            <th className="px-4 py-3 text-right">天數</th>
                            <th className="px-4 py-3 text-right">當前規模(億)</th>
                            <th className="px-4 py-3 text-right">成長倍數</th>
                            <th className="px-4 py-3 text-right">累計申購(億)</th>
                            <th className="px-4 py-3 text-right">申購占成長比</th>
                            <th className="px-4 py-3 text-center">走勢</th>
                            <th className="px-4 py-3 w-8" />
                        </tr>
                    </thead>
                    <tbody>
                        {stats.map(s => {
                            const isExp = expanded.has(s.etf_code);
                            return (
                                <React.Fragment key={s.etf_code}>
                                    <tr
                                        className="border-t border-slate-100 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors"
                                        onClick={() => toggle(s.etf_code)}
                                    >
                                        <td className="px-4 py-3">
                                            <span className="inline-block w-2 h-2 rounded-full mr-2 shrink-0" style={{ backgroundColor: s.color }} />
                                            <span className="font-mono text-xs">{s.etf_code}</span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300 max-w-[160px] truncate">{s.name}</td>
                                        <td className="px-4 py-3 text-right text-slate-500">{s.n_days}</td>
                                        <td className="px-4 py-3 text-right font-medium text-slate-800 dark:text-slate-200">{s.aum_current.toFixed(1)}</td>
                                        <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">{s.growth_mult.toFixed(2)}x</td>
                                        <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{s.inflow_cum.toFixed(1)}</td>
                                        <td
                                            className={`px-4 py-3 text-right ${inflowColor(s.inflow_share)}`}
                                            title={inflowTooltip(s.inflow_share)}
                                        >
                                            {(s.inflow_share * 100).toFixed(1)}%
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-center">
                                                <Sparkline series={s.series} color={s.color} />
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center text-slate-400 text-xs">{isExp ? '▲' : '▼'}</td>
                                    </tr>
                                    {isExp && (
                                        <tr className="bg-slate-50/60 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-700/50">
                                            <td colSpan={9} className="px-6 py-4">
                                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
                                                    <div>
                                                        <div className="text-slate-400 mb-0.5">發行商</div>
                                                        <div className="font-medium text-slate-700 dark:text-slate-300">{s.issuer || '—'}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-slate-400 mb-0.5">首次資料日</div>
                                                        <div className="font-medium text-slate-700 dark:text-slate-300">{s.first_date}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-slate-400 mb-0.5">當前 NAV</div>
                                                        <div className="font-medium text-slate-700 dark:text-slate-300">{s.nav_current.toFixed(2)}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-slate-400 mb-0.5">流通單位數（億份）</div>
                                                        <div className="font-medium text-slate-700 dark:text-slate-300">{s.units_current.toFixed(4)}</div>
                                                    </div>
                                                    {s.top_inflow && (
                                                        <div>
                                                            <div className="text-slate-400 mb-0.5">最高單日申購</div>
                                                            <div className="font-medium text-emerald-600 dark:text-emerald-400">
                                                                {s.top_inflow.date}（+{s.top_inflow.val.toFixed(2)} 億）
                                                            </div>
                                                        </div>
                                                    )}
                                                    {s.top_outflow && (
                                                        <div>
                                                            <div className="text-slate-400 mb-0.5">最大單日贖回</div>
                                                            <div className="font-medium text-rose-600 dark:text-rose-400">
                                                                {s.top_outflow.date}（{s.top_outflow.val.toFixed(2)} 億）
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className="col-span-2">
                                                        <div className="text-slate-400 mb-0.5">申購占成長比說明</div>
                                                        <div className={`font-medium ${inflowColor(s.inflow_share)}`}>
                                                            {inflowTooltip(s.inflow_share)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-700/50 text-xs text-slate-400 flex flex-wrap gap-3">
                <span>點擊列展開詳情</span>
                <span className="text-rose-600">申購占成長比 &gt;70% 警示</span>
                <span className="text-emerald-600">&lt;30% 正向（淨值驅動）</span>
            </div>
        </div>
    );
}
