'use client';

import React from 'react';
import type { StockPnlResult } from '@/app/actions/investmentPnl';

interface ManagerPnlCardProps {
    result: StockPnlResult;
    showEtfLabel?: boolean;
}

// Task 2.3: SVG P&L curve with positive (rose) / negative (emerald) fill areas
function PnlCurve({ curve }: { curve: StockPnlResult['curve'] }) {
    if (curve.length < 2) return (
        <div className="h-16 flex items-center justify-center text-xs text-slate-400">
            資料累積中…
        </div>
    );

    const W = 400;
    const H = 60;
    const PAD = 4;

    const vals = curve.map(c => c.value);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    const toY = (v: number) => H - ((v - min) / range) * (H - PAD * 2) - PAD;

    const pts = vals.map((v, i) => {
        const x = (i / (vals.length - 1)) * W;
        return { x, y: toY(v) };
    });

    const polylinePoints = pts.map(p => `${p.x},${p.y}`).join(' ');
    const polygonPoints = [
        `0,${toY(0 < min ? min : 0 > max ? max : 0)}`,
        ...pts.map(p => `${p.x},${p.y}`),
        `${W},${toY(0 < min ? min : 0 > max ? max : 0)}`,
    ].join(' ');

    const hasZero = min < 0 && max > 0;
    const zeroY = toY(0);
    const id = React.useId();

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16" preserveAspectRatio="none">
            <defs>
                {hasZero && (
                    <>
                        <clipPath id={`${id}-pos`}>
                            <rect x="0" y="0" width={W} height={zeroY} />
                        </clipPath>
                        <clipPath id={`${id}-neg`}>
                            <rect x="0" y={zeroY} width={W} height={H - zeroY} />
                        </clipPath>
                    </>
                )}
            </defs>

            {/* Zero line */}
            {hasZero && (
                <line x1="0" y1={zeroY} x2={W} y2={zeroY}
                    stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 2" />
            )}

            {/* Positive fill (rose) */}
            {hasZero ? (
                <polygon points={polygonPoints}
                    fill="rgba(244,63,94,0.15)"
                    clipPath={`url(#${id}-pos)`} />
            ) : max >= 0 ? (
                <polygon points={polygonPoints} fill="rgba(244,63,94,0.15)" />
            ) : null}

            {/* Negative fill (emerald) */}
            {hasZero ? (
                <polygon points={polygonPoints}
                    fill="rgba(16,185,129,0.15)"
                    clipPath={`url(#${id}-neg)`} />
            ) : max < 0 ? (
                <polygon points={polygonPoints} fill="rgba(16,185,129,0.15)" />
            ) : null}

            {/* Main line */}
            <polyline
                points={polylinePoints}
                fill="none"
                stroke={vals[vals.length - 1]! >= 0 ? '#e11d48' : '#059669'}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function MetricCell({ label, value, colorClass }: {
    label: string; value: string; colorClass?: string;
}) {
    return (
        <div className="space-y-0.5">
            <div className="text-[10px] text-slate-500 dark:text-slate-400">{label}</div>
            <div className={`text-base font-bold tabular-nums ${colorClass ?? 'text-slate-800 dark:text-slate-200'}`}>
                {value}
            </div>
        </div>
    );
}

// Task 2.1–2.5: ManagerPnlCard
export function ManagerPnlCard({ result, showEtfLabel = true }: ManagerPnlCardProps) {
    // Task 2.5: N/A states
    if (result.status === 'no_shares') {
        return (
            <div className="glass-card rounded-xl p-4 space-y-2">
                {showEtfLabel && (
                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        {result.etfCode} {result.etfName}
                    </div>
                )}
                <div className="text-sm text-slate-400">N/A — 無股數資料</div>
            </div>
        );
    }

    if (result.status === 'no_price') {
        return (
            <div className="glass-card rounded-xl p-4 space-y-2">
                {showEtfLabel && (
                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        {result.etfCode} {result.etfName}
                    </div>
                )}
                <div className="text-sm text-slate-400">N/A — 無收盤價資料</div>
            </div>
        );
    }

    // Task 2.2: 台股色彩慣例 — 正漲 rose, 負跌 emerald
    const isPositive = result.pnl >= 0;
    const pnlColor = isPositive
        ? 'text-rose-600 dark:text-rose-400'
        : 'text-emerald-600 dark:text-emerald-400';

    const fmt億 = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)} 億`;
    const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
    const fmtPos億 = (v: number) => `${v.toFixed(2)} 億`;

    return (
        <div className="glass-card rounded-xl p-4 space-y-3">
            {showEtfLabel && (
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    {result.etfCode} {result.etfName}
                </div>
            )}

            {/* Task 2.1: 4 metrics */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <MetricCell
                    label="損益額"
                    value={fmt億(result.pnl)}
                    colorClass={pnlColor}
                />
                <MetricCell
                    label="報酬率"
                    value={fmtPct(result.pnlPct)}
                    colorClass={pnlColor}
                />
                <MetricCell label="目前市值" value={fmtPos億(result.mvNow)} />
                <MetricCell label="累計成本" value={fmtPos億(result.costBasis)} />
            </div>

            {/* Task 2.3: P&L curve */}
            <PnlCurve curve={result.curve} />

            {/* Task 2.4: 資料起算日免責 */}
            {result.minDate && (
                <div className="text-[10px] text-slate-400 text-right">
                    損益計算自 {result.minDate} 起，早於此日的成本未納入
                </div>
            )}
        </div>
    );
}

// Task 2.5: Skeleton loading state
export function ManagerPnlCardSkeleton() {
    return (
        <div className="glass-card rounded-xl p-4 space-y-3 animate-pulse">
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-32" />
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="space-y-1">
                        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-12" />
                        <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-20" />
                    </div>
                ))}
            </div>
            <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded" />
        </div>
    );
}
