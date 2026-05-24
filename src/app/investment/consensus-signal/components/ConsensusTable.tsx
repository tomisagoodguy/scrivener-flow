'use client';

import { useState } from 'react';
import type { ConsensusSignal } from '@/types';

const STRATEGY_LABELS: Record<string, string> = {
    super8888: '超級8888',
    capital_layer: '資金層',
    low_vol_cap: '低波資本',
    broker_ranked: '券商排行',
    low_vol_alpha: '低波Alpha',
};

type FilterMode = 'all' | '3' | '2' | '1';
type SortKey = 'consensus_count' | 'fund_score' | 'fund_consec_days';

function ConsensusBadge({ count }: { count: number }) {
    if (count === 3) return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border border-violet-200/60 dark:border-violet-700/40">
            三重
        </span>
    );
    if (count === 2) return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
            雙重
        </span>
    );
    return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
            單一
        </span>
    );
}

export default function ConsensusTable({ signals }: { signals: ConsensusSignal[] }) {
    const [filter, setFilter] = useState<FilterMode>('all');
    const [sortKey, setSortKey] = useState<SortKey>('consensus_count');
    const [sortAsc, setSortAsc] = useState(false);

    const filtered = signals.filter((s) => {
        if (filter === '3') return s.consensus_count === 3;
        if (filter === '2') return s.consensus_count === 2;
        if (filter === '1') return s.consensus_count === 1;
        return true;
    });

    const sorted = [...filtered].sort((a, b) => {
        let av: number, bv: number;
        if (sortKey === 'fund_score') { av = a.fund_score ?? 0; bv = b.fund_score ?? 0; }
        else if (sortKey === 'fund_consec_days') { av = a.fund_consec_days; bv = b.fund_consec_days; }
        else { av = a.consensus_count; bv = b.consensus_count; }
        return sortAsc ? av - bv : bv - av;
    });

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) setSortAsc((v) => !v);
        else { setSortKey(key); setSortAsc(false); }
    };

    const filterBtns: { key: FilterMode; label: string }[] = [
        { key: 'all', label: '全部' },
        { key: '3', label: '三重' },
        { key: '2', label: '雙重' },
        { key: '1', label: '單一' },
    ];

    return (
        <div className="glass-card overflow-hidden">
            {/* Filters */}
            <div className="px-4 py-3 border-b border-white/30 dark:border-slate-700/40 flex items-center justify-between gap-3 flex-wrap">
                <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    全市場共識掃描
                    <span className="ml-2 text-xs font-normal text-slate-400">{sorted.length} 檔</span>
                </h2>
                <div className="flex gap-1">
                    {filterBtns.map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setFilter(key)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                filter === key
                                    ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-200/50 dark:border-slate-700/40">
                        <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">股票</th>
                            <th
                                className="px-3 py-2 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 cursor-pointer hover:text-blue-600 whitespace-nowrap"
                                onClick={() => toggleSort('consensus_count')}
                            >
                                共識層{sortKey === 'consensus_count' ? (sortAsc ? ' ↑' : ' ↓') : ''}
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">ETF 加碼</th>
                            <th
                                className="px-3 py-2 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 cursor-pointer hover:text-blue-600 whitespace-nowrap"
                                onClick={() => toggleSort('fund_score')}
                            >
                                投信排名{sortKey === 'fund_score' ? (sortAsc ? ' ↑' : ' ↓') : ''}
                            </th>
                            <th
                                className="px-3 py-2 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 cursor-pointer hover:text-blue-600 whitespace-nowrap"
                                onClick={() => toggleSort('fund_consec_days')}
                            >
                                連續天{sortKey === 'fund_consec_days' ? (sortAsc ? ' ↑' : ' ↓') : ''}
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">量化策略</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/50 dark:divide-slate-800/50">
                        {sorted.map((sig) => (
                            <tr key={sig.stock_id} className="hover:bg-blue-50/30 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="px-3 py-2">
                                    <div className="font-medium text-slate-800 dark:text-slate-200">{sig.stock_id}</div>
                                    {sig.stock_name && (
                                        <div className="text-xs text-slate-400 truncate max-w-[6rem]">{sig.stock_name}</div>
                                    )}
                                </td>
                                <td className="px-3 py-2 text-center">
                                    <ConsensusBadge count={sig.consensus_count} />
                                </td>
                                <td className="px-3 py-2">
                                    {sig.etf_buying ? (
                                        <div className="flex flex-wrap gap-1">
                                            {sig.etf_etfs.map((etf) => (
                                                <span key={etf} className="text-xs px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 font-medium">
                                                    {etf}
                                                </span>
                                            ))}
                                        </div>
                                    ) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                                </td>
                                <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-300 font-mono text-xs">
                                    {sig.fund_buying ? (
                                        <span className="text-rose-600 dark:text-rose-400 font-semibold">
                                            Top {Math.max(0, 100 - (sig.fund_score ?? 0) + 1)}%
                                        </span>
                                    ) : sig.fund_score !== null ? (
                                        <span className="text-slate-400">Top {Math.max(0, 100 - sig.fund_score + 1)}%</span>
                                    ) : '—'}
                                </td>
                                <td className="px-3 py-2 text-right text-xs text-slate-500 dark:text-slate-400">
                                    {sig.fund_consec_days > 0 ? `${sig.fund_consec_days} 天` : '—'}
                                </td>
                                <td className="px-3 py-2">
                                    {sig.strategy_hits.length > 0 ? (
                                        <div className="flex flex-wrap gap-1">
                                            {sig.strategy_hits.map((sid) => (
                                                <span key={sid} className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium">
                                                    {STRATEGY_LABELS[sid] ?? sid}
                                                </span>
                                            ))}
                                        </div>
                                    ) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
