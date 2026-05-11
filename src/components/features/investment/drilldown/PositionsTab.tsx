'use client';

import type { PositionRow } from './types';

export function EmptyState({ message = '暫無資料' }: { message?: string }) {
    return (
        <div className="glass-card rounded-2xl p-12 text-center text-slate-400">
            <p>{message}</p>
            <p className="text-xs mt-2">執行 backfill 腳本後資料將自動填入</p>
        </div>
    );
}

export function PositionsTab({ positions, activeOnly }: { positions: PositionRow[]; activeOnly?: boolean }) {
    const filtered = activeOnly == null
        ? positions
        : positions.filter(p => activeOnly ? p.is_active : !p.is_active);
    if (!filtered.length) return <EmptyState />;

    const sorted = [...filtered].sort((a, b) => b.pnl_pct - a.pnl_pct);

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500 dark:text-slate-400">
                        <th className="px-3 py-2.5 text-left">代號</th>
                        <th className="px-3 py-2.5 text-right">張數</th>
                        <th className="px-3 py-2.5 text-right">進場日</th>
                        <th className="px-3 py-2.5 text-right">天數</th>
                        <th className="px-3 py-2.5 text-right">損益%</th>
                        {!activeOnly && <th className="px-3 py-2.5 text-right">出場日</th>}
                    </tr>
                </thead>
                <tbody>
                    {sorted.map(p => {
                        const pct = activeOnly ? p.pnl_pct : (p.realized_pnl_pct ?? p.pnl_pct);
                        const positive = pct >= 0;
                        return (
                            <tr key={p.stock_code} className="border-t border-slate-100 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                <td className="px-3 py-2.5 font-mono text-xs text-indigo-600 dark:text-indigo-400 font-bold">{p.stock_code}</td>
                                <td className="px-3 py-2.5 text-right text-slate-600 dark:text-slate-400">{p.curr_shares.toLocaleString()}</td>
                                <td className="px-3 py-2.5 text-right text-slate-500 text-xs">{p.first_entry_date}</td>
                                <td className="px-3 py-2.5 text-right text-slate-500">{p.delta_days}d</td>
                                <td className={`px-3 py-2.5 text-right font-medium ${positive ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                    {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                                </td>
                                {!activeOnly && <td className="px-3 py-2.5 text-right text-slate-500 text-xs">{p.exit_date ?? '—'}</td>}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export function ExitedSummary({ positions }: { positions: PositionRow[] }) {
    const exited = positions.filter(p => !p.is_active);
    if (!exited.length) return null;
    const wins = exited.filter(p => (p.realized_pnl_pct ?? 0) > 0).length;
    const avgPct = exited.reduce((s, p) => s + (p.realized_pnl_pct ?? 0), 0) / exited.length;
    const avgDays = Math.round(exited.reduce((s, p) => s + p.delta_days, 0) / exited.length);
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
                { label: '出清標的', value: `${exited.length} 檔` },
                { label: '平均持倉', value: `${avgDays} 天` },
                { label: '平均損益', value: `${avgPct >= 0 ? '+' : ''}${avgPct.toFixed(2)}%`, positive: avgPct >= 0 },
                { label: '勝率', value: `${((wins / exited.length) * 100).toFixed(0)}%` },
            ].map(item => (
                <div key={item.label} className="glass-card rounded-xl p-3 text-center">
                    <div className="text-xs text-slate-400 mb-1">{item.label}</div>
                    <div className={`font-bold ${item.positive == null ? 'text-slate-800 dark:text-slate-200' : item.positive ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {item.value}
                    </div>
                </div>
            ))}
        </div>
    );
}
