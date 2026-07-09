import type { GapItem } from '@/app/actions/getManagerDualTrack';

export default function GapTablePanel({ gapTable }: { gapTable: GapItem[] }) {
    const fundOnly = gapTable.filter((g) => g.side === 'fund-only');
    const etfOnly = gapTable.filter((g) => g.side === 'etf-only');

    return (
        <div className="glass-card p-4">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">雙軌落差表</h3>

            {gapTable.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">目前無足夠資料計算落差，或兩軌持股完全重疊。</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mb-2">
                            基金有、ETF 無（{fundOnly.length}）
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {fundOnly.length === 0 ? (
                                <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                            ) : (
                                fundOnly.map((g) => (
                                    <span
                                        key={g.stock_code}
                                        className="text-xs px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300"
                                    >
                                        {g.stock_code}
                                        {g.stock_name ? ` ${g.stock_name}` : ''}
                                    </span>
                                ))
                            )}
                        </div>
                    </div>

                    <div>
                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2">
                            ETF 有、基金無（{etfOnly.length}）
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {etfOnly.length === 0 ? (
                                <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                            ) : (
                                etfOnly.map((g) => (
                                    <span
                                        key={g.stock_code}
                                        className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                                    >
                                        {g.stock_code}
                                        {g.stock_name ? ` ${g.stock_name}` : ''}
                                    </span>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
