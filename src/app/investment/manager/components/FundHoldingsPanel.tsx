import type { FundHoldingItem } from '@/app/actions/getManagerDualTrack';

export default function FundHoldingsPanel({
    holdings,
    ym,
    currentYm,
    fundShorts,
}: {
    holdings: FundHoldingItem[];
    ym: string | null;
    currentYm: string;
    fundShorts: string[];
}) {
    return (
        <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    基金月報 Top 10
                    <span className="ml-2 text-xs font-normal px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">
                        月頻真雙軌
                    </span>
                </h3>
                <span className="text-xs text-slate-400">{ym ?? '無資料'}</span>
            </div>

            {fundShorts.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">此經理人未管理共同基金。</p>
            ) : holdings.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                    缺 {currentYm} 月報資料（最新僅至 {ym ?? '無'}），可能尚未公告或 Pipeline 未同步。
                </p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead className="text-slate-500 dark:text-slate-400 border-b border-slate-200/50 dark:border-slate-700/40">
                            <tr>
                                <th className="text-left py-1.5">#</th>
                                <th className="text-left py-1.5">股票</th>
                                <th className="text-left py-1.5">基金</th>
                                <th className="text-right py-1.5">佔比</th>
                                <th className="text-left py-1.5">來源</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/50 dark:divide-slate-800/50">
                            {holdings.map((h) => (
                                <tr key={`${h.fund_short}-${h.stock_code}`}>
                                    <td className="py-1.5 text-slate-400">{h.rank ?? '—'}</td>
                                    <td className="py-1.5">
                                        <span className="font-medium text-slate-700 dark:text-slate-200">{h.stock_code}</span>
                                        {h.stock_name && (
                                            <span className="ml-1 text-slate-400">{h.stock_name}</span>
                                        )}
                                    </td>
                                    <td className="py-1.5 text-slate-500 dark:text-slate-400">{h.fund_short}</td>
                                    <td className="py-1.5 text-right font-mono text-slate-600 dark:text-slate-300">
                                        {h.pct !== null ? `${h.pct.toFixed(2)}%` : '—'}
                                    </td>
                                    <td className="py-1.5 text-slate-400 uppercase">{h.source}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
