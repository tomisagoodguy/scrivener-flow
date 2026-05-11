'use client';

import { useState } from 'react';
import type { DiffLogRow } from './types';

const ACTION_LABELS: Record<string, string> = {
    BUY: '加碼', IN: '新建倉', SELL: '減碼', OUT: '出清',
};

function TodayDiffRow({ row, isPositive, maxAmount, maxWeight }: {
    row: DiffLogRow; isPositive: boolean; maxAmount: number; maxWeight: number;
}) {
    const diffWeight = row.diff_weight ??
        (row.curr_weight != null && row.prev_weight != null ? row.curr_weight - row.prev_weight : null);
    const shares張 = row.diff_shares != null ? Math.round(Math.abs(row.diff_shares) / 1000) : null;
    const barPct = maxAmount > 0 && row.amount_亿 != null
        ? (row.amount_亿 / maxAmount) * 100
        : maxWeight > 0 && diffWeight != null
            ? (Math.abs(diffWeight) / maxWeight) * 100
            : 0;
    const colorClass = isPositive ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400';

    return (
        <div className="glass-card rounded-xl px-4 py-2.5 flex items-center gap-3 text-sm hover:shadow-md transition-shadow cursor-pointer">
            <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 w-12 shrink-0">{row.stock_code}</span>
            <span className="text-slate-700 dark:text-slate-300 text-xs w-16 truncate shrink-0">{row.stock_name ?? ''}</span>
            <div className="flex flex-1 items-center gap-2 min-w-0">
                {row.amount_亿 != null && (
                    <span className={`text-xs font-bold ${colorClass} w-24 text-right shrink-0`}>
                        {isPositive ? '+' : '-'}{row.amount_亿.toFixed(2)} 億元
                    </span>
                )}
                <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2 min-w-8 max-w-40">
                    <div
                        className={`h-2 rounded-full ${isPositive ? 'bg-rose-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(100, barPct)}%` }}
                    />
                </div>
            </div>
            {shares張 != null && (
                <span className={`text-xs font-medium ${colorClass} w-16 text-right shrink-0`}>
                    {isPositive ? '+' : '-'}{shares張.toLocaleString()} 張
                </span>
            )}
            {diffWeight != null && (
                <span className={`text-xs font-medium w-14 text-right shrink-0 ${colorClass}`}>
                    {diffWeight >= 0 ? '+' : ''}{diffWeight.toFixed(2)}pp
                </span>
            )}
        </div>
    );
}

interface TodayDiffSummaryProps {
    diffs: DiffLogRow[];
    dataDate?: string;
    prevDate?: string;
}

export function TodayDiffSummary({ diffs, dataDate, prevDate }: TodayDiffSummaryProps) {
    const [filterSmall, setFilterSmall] = useState(false);

    if (!diffs.length) {
        return (
            <div className="glass-card rounded-2xl p-12 text-center text-slate-400">
                <p>今日無加減碼異動</p>
                <p className="text-xs mt-2">執行 backfill 腳本後資料將自動填入</p>
            </div>
        );
    }

    const displayed = filterSmall
        ? diffs.filter(d => Math.abs(d.diff_weight ?? (d.curr_weight != null && d.prev_weight != null ? d.curr_weight - d.prev_weight : 0)) >= 0.3)
        : diffs;

    const allGroups: Record<string, DiffLogRow[]> = { BUY: [], IN: [], SELL: [], OUT: [] };
    const shownGroups: Record<string, DiffLogRow[]> = { BUY: [], IN: [], SELL: [], OUT: [] };
    for (const d of diffs) allGroups[d.change_type]?.push(d);
    for (const d of displayed) shownGroups[d.change_type]?.push(d);

    const maxAmount = Math.max(0, ...diffs.map(d => d.amount_亿 ?? 0));
    const maxWeight = Math.max(0, ...diffs.map(d => {
        const dw = d.diff_weight ?? (d.curr_weight != null && d.prev_weight != null ? d.curr_weight - d.prev_weight : 0);
        return Math.abs(dw);
    }));

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                {dataDate && prevDate && (
                    <span className="font-mono text-slate-600 dark:text-slate-300">{dataDate} vs {prevDate}</span>
                )}
                {dataDate && prevDate && <span>·</span>}
                <button
                    onClick={() => setFilterSmall(f => !f)}
                    className={`px-2.5 py-0.5 rounded-full border text-xs transition-colors ${
                        filterSmall
                            ? 'bg-indigo-100 border-indigo-300 text-indigo-700 dark:bg-indigo-900/50 dark:border-indigo-600 dark:text-indigo-300'
                            : 'bg-slate-100 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-600 hover:border-slate-300'
                    }`}
                >
                    過濾 &lt;0.3% 試水溫
                </button>
                <span>·</span>
                <span>點卡片看歷史軌跡</span>
            </div>

            {(['BUY', 'SELL', 'IN', 'OUT'] as const).map(action => {
                const allRows = allGroups[action] ?? [];
                const rows = shownGroups[action] ?? [];
                if (!allRows.length) return null;
                const isPositive = action === 'BUY' || action === 'IN';
                const significantCount = allRows.filter(d =>
                    Math.abs(d.diff_weight ?? (d.curr_weight != null && d.prev_weight != null ? d.curr_weight - d.prev_weight : 0)) >= 0.3
                ).length;

                return (
                    <div key={action}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-white ${
                                isPositive ? 'bg-rose-500' : 'bg-emerald-600'
                            }`}>
                                {ACTION_LABELS[action]} {rows.length}
                                {filterSmall && rows.length !== allRows.length && (
                                    <span className="opacity-60 font-normal">/{allRows.length}</span>
                                )}
                            </span>
                            {!filterSmall && significantCount > 0 && (
                                <span className="text-xs text-indigo-500 dark:text-indigo-400 font-medium">
                                    +{significantCount}
                                </span>
                            )}
                        </div>
                        {rows.length === 0 ? (
                            <p className="text-xs text-slate-400 pl-1">（全部為試水溫，已過濾）</p>
                        ) : (
                            <div className="space-y-1.5">
                                {rows.map((d, i) => (
                                    <TodayDiffRow key={i} row={d} isPositive={isPositive} maxAmount={maxAmount} maxWeight={maxWeight} />
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
