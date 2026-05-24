'use client';

import { useState } from 'react';
import type { FundMomentumSignal } from '@/types';

type SortKey = 'score' | 'fund_1d' | 'fund_5d' | 'fund_20d' | 'consec_days' | 'fund_ratio_5d';

function ColHead({
    label, k, sortKey, sortAsc, onToggle,
}: { label: string; k: SortKey; sortKey: SortKey; sortAsc: boolean; onToggle: (k: SortKey) => void }) {
    return (
        <th
            className="px-3 py-2 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 cursor-pointer select-none hover:text-blue-600 dark:hover:text-blue-400 whitespace-nowrap"
            onClick={() => onToggle(k)}
        >
            {label}{sortKey === k ? (sortAsc ? ' ↑' : ' ↓') : ''}
        </th>
    );
}

function fmt張(shares: number | null): string {
    if (shares === null) return '—';
    const 張 = Math.round(shares / 1000);
    return 張.toLocaleString();
}

function fmtRatio(ratio: number | null): string {
    if (ratio === null) return '—';
    return (ratio * 100).toFixed(2) + '%';
}

function fmtRank(score: number): string {
    const pct = Math.max(0, 100 - score + 1);
    return `Top ${pct}%`;
}

export default function FundHealthTable({ signals }: { signals: FundMomentumSignal[] }) {
    const [sortKey, setSortKey] = useState<SortKey>('score');
    const [sortAsc, setSortAsc] = useState(false);

    const sorted = [...signals].sort((a, b) => {
        let av: number, bv: number;
        if (sortKey === 'score') {
            av = a.score; bv = b.score;
        } else if (sortKey === 'consec_days') {
            av = a.consec_days; bv = b.consec_days;
        } else if (sortKey === 'fund_1d') {
            av = a.fund_1d ?? -Infinity; bv = b.fund_1d ?? -Infinity;
        } else if (sortKey === 'fund_5d') {
            av = a.fund_5d ?? -Infinity; bv = b.fund_5d ?? -Infinity;
        } else if (sortKey === 'fund_20d') {
            av = a.fund_20d ?? -Infinity; bv = b.fund_20d ?? -Infinity;
        } else {
            av = a.fund_ratio_5d ?? -Infinity; bv = b.fund_ratio_5d ?? -Infinity;
        }
        return sortAsc ? av - bv : bv - av;
    });

    const toggle = (key: SortKey) => {
        if (sortKey === key) setSortAsc((v) => !v);
        else { setSortKey(key); setSortAsc(false); }
    };
    const colHeadProps = { sortKey, sortAsc, onToggle: toggle };

    if (signals.length === 0) {
        return (
            <div className="glass-card p-6 text-center">
                <p className="text-slate-400 text-sm">今日尚無投信買超資料。</p>
            </div>
        );
    }

    return (
        <div className="glass-card overflow-hidden">
            <div className="px-4 py-3 border-b border-white/30 dark:border-slate-700/40">
                <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">投信買超健康度</h2>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-200/50 dark:border-slate-700/40">
                        <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">
                                股票
                            </th>
                            <ColHead label="1日（張）" k="fund_1d" {...colHeadProps} />
                            <ColHead label="5日累積（張）" k="fund_5d" {...colHeadProps} />
                            <ColHead label="20日累積（張）" k="fund_20d" {...colHeadProps} />
                            <ColHead label="連續天數" k="consec_days" {...colHeadProps} />
                            <ColHead label="買超比率" k="fund_ratio_5d" {...colHeadProps} />
                            <ColHead label="全市場排名" k="score" {...colHeadProps} />
                            <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
                                建倉確認
                            </th>
                            <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
                                ETF共識
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/50 dark:divide-slate-800/50">
                        {sorted.map((sig) => {
                            const isNeg1d = (sig.fund_1d ?? 0) < 0;
                            const isLongStreak = sig.consec_days >= 10;
                            return (
                                <tr
                                    key={sig.stock_id}
                                    className="hover:bg-blue-50/30 dark:hover:bg-slate-800/30 transition-colors"
                                >
                                    <td className="px-3 py-2">
                                        <div className="font-medium text-slate-800 dark:text-slate-200">
                                            {sig.stock_id}
                                        </div>
                                        {sig.stock_name && (
                                            <div className="text-xs text-slate-400 truncate max-w-[6rem]">
                                                {sig.stock_name}
                                            </div>
                                        )}
                                    </td>
                                    <td className={`px-3 py-2 text-right font-mono ${isNeg1d ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                        {fmt張(sig.fund_1d)}
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono text-slate-700 dark:text-slate-300">
                                        {fmt張(sig.fund_5d)}
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono text-slate-700 dark:text-slate-300">
                                        {fmt張(sig.fund_20d)}
                                    </td>
                                    <td className={`px-3 py-2 text-right font-semibold ${isLongStreak ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                        {sig.consec_days > 0 ? `${sig.consec_days} 天` : '—'}
                                    </td>
                                    <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-300">
                                        {fmtRatio(sig.fund_ratio_5d)}
                                    </td>
                                    <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-300">
                                        {fmtRank(sig.score)}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        {sig.is_selected ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                                                建倉
                                            </span>
                                        ) : '—'}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        {sig.etf_consensus ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                                                ETF共識
                                            </span>
                                        ) : '—'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
