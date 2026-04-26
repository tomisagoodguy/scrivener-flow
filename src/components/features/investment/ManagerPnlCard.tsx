'use client';

import React from 'react';
import type { StockPnlResult } from '@/types/investment';

interface ManagerPnlCardProps {
    result: StockPnlResult;
    showEtfLabel?: boolean;
}

function MiniSparkline({ curve }: { curve: StockPnlResult['curve'] }) {
    if (curve.length < 2) return <div className="w-20 h-8" />;

    const W = 80;
    const H = 32;
    const vals = curve.map(c => c.value);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    const toY = (v: number) => H - ((v - min) / range) * (H - 4) - 2;

    const pts = vals.map((v, i) => ({ x: (i / (vals.length - 1)) * W, y: toY(v) }));
    const line = pts.map(p => `${p.x},${p.y}`).join(' ');
    const fill = [
        `0,${H}`,
        ...pts.map(p => `${p.x},${p.y}`),
        `${W},${H}`,
    ].join(' ');

    const last = vals[vals.length - 1]!;
    const color = last >= 0 ? '#e11d48' : '#059669';
    const fillColor = last >= 0 ? 'rgba(244,63,94,0.15)' : 'rgba(16,185,129,0.15)';

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-20 h-8" preserveAspectRatio="none">
            <polygon points={fill} fill={fillColor} />
            <polyline points={line} fill="none" stroke={color} strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

export function ManagerPnlCard({ result, showEtfLabel = true }: ManagerPnlCardProps) {
    if (result.status === 'no_shares' || result.status === 'no_price') {
        return (
            <div className="glass-card rounded-lg px-3 py-2 flex items-center gap-3">
                {showEtfLabel && (
                    <span className="text-xs font-semibold text-slate-500 w-16 shrink-0">
                        {result.etfCode}
                    </span>
                )}
                <span className="text-xs text-slate-400">
                    {result.status === 'no_shares' ? '無股數資料' : '無收盤價資料'}
                </span>
            </div>
        );
    }

    const isPositive = result.pnl >= 0;
    const pnlColor = isPositive ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400';
    const bgAccent = isPositive ? 'border-l-rose-400' : 'border-l-emerald-400';

    const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
    const fmtBil = (v: number) => `${v >= 0 ? '' : '-'}${Math.abs(v).toFixed(2)}億`;
    const fmtPrice = (v: number | undefined) => v != null ? `$${v.toFixed(0)}` : '—';
    const fmtLots = (s: number | undefined) => s != null ? `${Math.round(s / 1000).toLocaleString()}張` : '—';

    return (
        <div className={`glass-card rounded-lg px-3 py-2.5 border-l-2 ${bgAccent} flex items-center gap-3`}>
            {/* ETF label */}
            {showEtfLabel && (
                <div className="shrink-0 w-16">
                    <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300 leading-tight">
                        {result.etfCode}
                    </div>
                    <div className="text-[9px] text-slate-400 leading-tight truncate">{result.etfName}</div>
                </div>
            )}

            {/* PnL 報酬率 + 損益額 */}
            <div className="shrink-0 text-right w-20">
                <div className={`text-sm font-bold tabular-nums ${pnlColor}`}>
                    {fmtPct(result.pnlPct)}
                </div>
                <div className={`text-[10px] tabular-nums ${pnlColor}`}>
                    {fmtBil(result.pnl)}
                </div>
            </div>

            {/* Divider */}
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 shrink-0" />

            {/* 4 mini metrics */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 flex-1 min-w-0">
                <div>
                    <span className="text-[9px] text-slate-400">市值 </span>
                    <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 tabular-nums">
                        {fmtBil(result.mvNow)}
                    </span>
                </div>
                <div>
                    <span className="text-[9px] text-slate-400">成本 </span>
                    <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 tabular-nums">
                        {fmtBil(result.costBasis)}
                    </span>
                </div>
                <div>
                    <span className="text-[9px] text-slate-400">均價 </span>
                    <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 tabular-nums">
                        {fmtPrice(result.entryPrice)}
                    </span>
                </div>
                <div>
                    <span className="text-[9px] text-slate-400">持倉 </span>
                    <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 tabular-nums">
                        {fmtLots(result.currShares)}
                        {result.deltaDays != null && (
                            <span className="text-slate-400 ml-1">{result.deltaDays}天</span>
                        )}
                    </span>
                </div>
            </div>

            {/* Sparkline */}
            <div className="shrink-0">
                <MiniSparkline curve={result.curve} />
            </div>
        </div>
    );
}

export function ManagerPnlCardSkeleton() {
    return (
        <div className="glass-card rounded-lg px-3 py-2.5 flex items-center gap-3 animate-pulse">
            <div className="w-16 space-y-1 shrink-0">
                <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded w-12" />
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-10" />
            </div>
            <div className="w-20 space-y-1 shrink-0">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 shrink-0" />
            <div className="flex-1 grid grid-cols-2 gap-1.5">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded" />
                ))}
            </div>
            <div className="w-20 h-8 bg-slate-100 dark:bg-slate-800 rounded shrink-0" />
        </div>
    );
}
