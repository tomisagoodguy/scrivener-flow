import type { FundMomentumSignal } from '@/types';

function fmtRank(score: number): string {
    return `Top ${Math.max(0, 100 - score + 1)}%`;
}

function fmt張(shares: number | null): string {
    if (shares === null) return '—';
    return Math.round(shares / 1000).toLocaleString() + ' 張';
}

export default function AccumulationCycleCard({ signals }: { signals: FundMomentumSignal[] }) {
    const accumulating = [...signals]
        .filter((s) => s.consec_days >= 3)
        .sort((a, b) => b.consec_days - a.consec_days);

    return (
        <div className="glass-card p-4">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">
                建倉週期偵測
            </h2>
            {accumulating.length === 0 ? (
                <p className="text-sm text-slate-400">目前無持倉進入建倉週期</p>
            ) : (
                <div className="flex flex-wrap gap-3">
                    {accumulating.map((sig) => (
                        <div
                            key={sig.stock_id}
                            className="flex flex-col gap-1 px-4 py-3 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-900/20 min-w-[140px]"
                        >
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                                    {sig.stock_id}
                                </span>
                                {sig.is_selected && (
                                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-medium">
                                        建倉確認
                                    </span>
                                )}
                            </div>
                            {sig.stock_name && (
                                <span className="text-xs text-slate-400 truncate">{sig.stock_name}</span>
                            )}
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                                連續 {sig.consec_days} 天買超
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                20日累積 {fmt張(sig.fund_20d)}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                    {fmtRank(sig.score)}
                                </span>
                                {sig.etf_consensus && (
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">
                                        ETF共識
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
