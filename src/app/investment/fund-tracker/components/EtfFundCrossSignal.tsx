import type { FundMomentumSignal } from '@/types';

function fmtRank(score: number): string {
    return `Top ${Math.max(0, 100 - score + 1)}%`;
}

export default function EtfFundCrossSignal({ signals }: { signals: FundMomentumSignal[] }) {
    const consensus = [...signals]
        .filter((s) => s.etf_consensus)
        .sort((a, b) => b.score - a.score);

    if (consensus.length === 0) return null;

    return (
        <div className="glass-card p-4">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">
                ETF × 投信機構共識
                <span className="ml-2 text-xs font-normal text-slate-400">
                    同日 ETF 加碼 + 投信買超 Top 30%
                </span>
            </h2>
            <div className="flex flex-wrap gap-3">
                {consensus.map((sig) => (
                    <div
                        key={sig.stock_id}
                        className="flex flex-col gap-1 px-4 py-3 rounded-xl border border-blue-200/60 dark:border-blue-800/40 bg-blue-50/50 dark:bg-blue-900/20 min-w-[140px]"
                    >
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                                {sig.stock_id}
                            </span>
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-medium">
                                共識
                            </span>
                        </div>
                        {sig.stock_name && (
                            <span className="text-xs text-slate-400 truncate">{sig.stock_name}</span>
                        )}
                        <span className="text-blue-600 dark:text-blue-400 text-xs font-semibold">
                            {fmtRank(sig.score)}
                        </span>
                        {sig.consec_days > 0 && (
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                連續 {sig.consec_days} 天
                            </span>
                        )}
                        {sig.is_selected && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 w-fit">
                                建倉確認
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
