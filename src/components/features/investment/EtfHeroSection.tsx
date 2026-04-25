'use client';

import { useMemo } from 'react';

interface PnlPoint {
    data_date: string;
    total_pnl: number;
    total_cost: number;
    total_pnl_pct: number;
    total_shares: number;
}

interface EtfHeroSectionProps {
    etfCode: string;
    etfName: string;
    pnlSeries: PnlPoint[];
}

// ── KPI 卡片 ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, positive }: { label: string; value: string; sub?: string; positive?: boolean | null }) {
    const valueColor = positive == null
        ? 'text-slate-800 dark:text-slate-200'
        : positive
            ? 'text-rose-600 dark:text-rose-400'
            : 'text-emerald-600 dark:text-emerald-400';

    return (
        <div className="glass-card rounded-xl p-4 space-y-1">
            <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
            <div className={`text-xl font-bold tabular-nums ${valueColor}`}>{value}</div>
            {sub && <div className="text-xs text-slate-400">{sub}</div>}
        </div>
    );
}

// ── PnL 走勢圖（SVG）─────────────────────────────────────────────────────────

function PnlChart({ series }: { series: PnlPoint[] }) {
    const W = 600;
    const H = 80;

    const vals = series.map(p => p.total_pnl);
    if (vals.length < 2) return <div className="h-20 flex items-center justify-center text-xs text-slate-400">資料累積中…</div>;

    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;

    const pts = vals.map((v, i) => {
        const x = (i / (vals.length - 1)) * W;
        const y = H - ((v - min) / range) * (H - 8) - 4;
        return `${x},${y}`;
    }).join(' ');

    const peakIdx = vals.indexOf(Math.max(...vals));
    const troughIdx = vals.indexOf(Math.min(...vals));
    const peakPt = { x: (peakIdx / (vals.length - 1)) * W, y: H - ((vals[peakIdx] - min) / range) * (H - 8) - 4 };
    const troughPt = { x: (troughIdx / (vals.length - 1)) * W, y: H - ((vals[troughIdx] - min) / range) * (H - 8) - 4 };

    const isPositive = vals[vals.length - 1] >= 0;
    const lineColor = isPositive ? '#e11d48' : '#059669'; // rose-600 / emerald-600

    return (
        <div className="space-y-1">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20 overflow-visible">
                <polyline points={pts} fill="none" stroke={lineColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                {/* 峰值標記 */}
                <circle cx={peakPt.x} cy={peakPt.y} r="4" fill="#e11d48" />
                {/* 谷值標記 */}
                <circle cx={troughPt.x} cy={troughPt.y} r="4" fill="#059669" />
                {/* 零軸 */}
                {min < 0 && max > 0 && (
                    <line
                        x1="0" y1={H - ((0 - min) / range) * (H - 8) - 4}
                        x2={W} y2={H - ((0 - min) / range) * (H - 8) - 4}
                        stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 2"
                    />
                )}
            </svg>
            <div className="flex justify-between text-xs text-slate-400">
                <span>{series[0]?.data_date}</span>
                <span className="text-rose-500">▲峰 {series[peakIdx]?.data_date} ({vals[peakIdx] > 0 ? '+' : ''}{vals[peakIdx].toFixed(2)}億)</span>
                <span className="text-emerald-500">▼谷 {series[troughIdx]?.data_date} ({vals[troughIdx].toFixed(2)}億)</span>
                <span>{series[series.length - 1]?.data_date}</span>
            </div>
        </div>
    );
}

// ── 主元件 ────────────────────────────────────────────────────────────────────

export function EtfHeroSection({ etfCode, etfName, pnlSeries }: EtfHeroSectionProps) {
    const latest = useMemo(() => pnlSeries[pnlSeries.length - 1] ?? null, [pnlSeries]);

    if (!latest) {
        return (
            <div className="glass-card rounded-2xl p-6 text-center text-slate-400 text-sm">
                損益資料累積中，首次執行 backfill 後顯示
            </div>
        );
    }

    const pnlPositive = latest.total_pnl >= 0;
    const pctPositive = latest.total_pnl_pct >= 0;

    return (
        <div className="glass-card rounded-2xl p-6 space-y-5">
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {etfCode} · {etfName} · 損益摘要
            </div>

            {/* KPI 卡片列 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard
                    label="總未實現損益"
                    value={`${latest.total_pnl >= 0 ? '+' : ''}${latest.total_pnl.toFixed(2)} 億`}
                    sub={latest.data_date}
                    positive={pnlPositive}
                />
                <KpiCard
                    label="總報酬率"
                    value={`${latest.total_pnl_pct >= 0 ? '+' : ''}${latest.total_pnl_pct.toFixed(2)}%`}
                    positive={pctPositive}
                />
                <KpiCard
                    label="目前市值"
                    value={`${(latest.total_cost + latest.total_pnl).toFixed(1)} 億`}
                    sub={`持股 ${latest.total_shares?.toLocaleString()} 張`}
                    positive={null}
                />
                <KpiCard
                    label="累計買入成本"
                    value={`${latest.total_cost.toFixed(1)} 億`}
                    positive={null}
                />
            </div>

            {/* 走勢圖 */}
            <div>
                <div className="text-xs text-slate-400 mb-2">累計損益走勢（億元）</div>
                <PnlChart series={pnlSeries} />
            </div>
        </div>
    );
}
