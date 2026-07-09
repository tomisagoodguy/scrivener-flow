import type { EtfHoldingItem } from '@/app/actions/getManagerDualTrack';

export default function EtfHoldingsPanel({
    holdings,
    dataDate,
    etfCodes,
}: {
    holdings: EtfHoldingItem[];
    dataDate: string | null;
    etfCodes: string[];
}) {
    return (
        <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    ETF 持股 Top 20
                    <span className="ml-2 text-xs font-normal px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                        日頻近似
                    </span>
                </h3>
                <span className="text-xs text-slate-400">{dataDate ?? '無資料'}</span>
            </div>

            {etfCodes.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">此經理人未管理主動 ETF。</p>
            ) : holdings.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                    尚無 ETF 持股資料，可能是 Pipeline 尚未同步 {etfCodes.join('/')}。
                </p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead className="text-slate-500 dark:text-slate-400 border-b border-slate-200/50 dark:border-slate-700/40">
                            <tr>
                                <th className="text-left py-1.5">#</th>
                                <th className="text-left py-1.5">股票</th>
                                <th className="text-left py-1.5">ETF</th>
                                <th className="text-right py-1.5">權重</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/50 dark:divide-slate-800/50">
                            {holdings.map((h) => (
                                <tr key={`${h.etf_code}-${h.stock_code}`}>
                                    <td className="py-1.5 text-slate-400">{h.rank}</td>
                                    <td className="py-1.5">
                                        <span className="font-medium text-slate-700 dark:text-slate-200">{h.stock_code}</span>
                                        {h.stock_name && (
                                            <span className="ml-1 text-slate-400">{h.stock_name}</span>
                                        )}
                                    </td>
                                    <td className="py-1.5 text-slate-500 dark:text-slate-400">{h.etf_code}</td>
                                    <td className="py-1.5 text-right font-mono text-slate-600 dark:text-slate-300">
                                        {h.weight.toFixed(2)}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
