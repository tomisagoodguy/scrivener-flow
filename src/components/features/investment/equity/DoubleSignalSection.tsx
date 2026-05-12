import Link from 'next/link';
import type { EquityRow, PriceIndicator, FlowEntry } from '@/lib/investment/equityPageData';
import { HighBadge } from './HighBadge';
import { HolderPctCell } from './HolderPctCell';
import { EtfBadge } from './EtfBadge';

function fmtNt(nt: number): string {
    const abs = Math.abs(nt);
    if (abs >= 1e8) return `${(nt / 1e8).toFixed(1)}億`;
    return `${(nt / 1e4).toFixed(0)}萬`;
}

export function DoubleSignalSection({
    rows,
    priceIndicators,
    etfMap,
    flowMap = {},
}: {
    rows: EquityRow[];
    priceIndicators: Record<string, PriceIndicator>;
    etfMap: Record<string, string[]>;
    flowMap?: Record<string, FlowEntry>;
}) {
    if (rows.length === 0) return null;
    const codeList = encodeURIComponent(rows.map(r => r.stock_code).join(','));
    const fromLabel = encodeURIComponent('雙重信號');
    return (
        <div className="glass-card rounded-2xl p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-violet-500/10 rounded-xl flex items-center justify-center">
                    <span className="text-sm font-bold text-violet-600">⚡</span>
                </div>
                <div>
                    <h2 className="font-bold text-gray-800 dark:text-gray-100">
                        雙重信號
                        <span className="ml-2 text-xs font-normal text-violet-500">主力買進 × 散戶出走</span>
                    </h2>
                    <p className="text-xs text-gray-500">同時符合兩條件・籌碼集中最完整訊號・Top {rows.length}</p>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b border-gray-200/60 text-[11px] text-gray-500 uppercase tracking-wide">
                            <th className="text-left py-2 px-2 w-6">#</th>
                            <th className="text-left py-2 px-2">股票</th>
                            <th className="text-right py-2 px-2">股東數</th>
                            <th className="text-right py-2 px-2">人數增減</th>
                            <th className="text-right py-2 px-2">200張+</th>
                            <th className="text-right py-2 px-2">400張+</th>
                            <th className="text-right py-2 px-2">1000張+</th>
                            <th className="text-right py-2 px-2">投信五日</th>
                            <th className="text-right py-2 px-2">成交額</th>
                            <th className="text-right py-2 px-2">ETF流</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, i) => {
                            const pi = priceIndicators[row.stock_code];
                            const shrChange = row.shareholders_change_rate;
                            return (
                                <tr key={row.stock_code} className="border-b border-gray-200/60 hover:bg-violet-50/40 transition-all">
                                    <td className="py-2.5 px-2 text-gray-400 font-mono">{i + 1}</td>
                                    <td className="py-2.5 px-2">
                                        <div className="flex items-center gap-1 flex-wrap">
                                            <Link href={`/investment/stock/${row.stock_code}?from=${fromLabel}&rank=${i + 1}&list=${codeList}`} className="font-semibold text-gray-800 dark:text-gray-200 hover:text-violet-600 transition-colors">
                                                {row.stock_name || row.stock_code}
                                            </Link>
                                            <span className="text-[10px] text-gray-400">{row.stock_code}</span>
                                            {pi && <HighBadge is200d={pi.is_200d_high} is20d={pi.is_20d_high} />}
                                            {(etfMap[row.stock_code] ?? []).map(code => (
                                                <EtfBadge key={code} etfCode={code} />
                                            ))}
                                        </div>
                                    </td>
                                    <td className="py-2.5 px-2 text-right text-gray-700 font-mono">{row.total_shareholders?.toLocaleString() ?? '—'}</td>
                                    <td className="py-2.5 px-2 text-right font-mono">
                                        {shrChange != null ? (
                                            <span className={shrChange < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                                                {shrChange > 0 ? '+' : ''}{shrChange.toFixed(2)}%
                                            </span>
                                        ) : '—'}
                                    </td>
                                    <td className="py-2.5 px-2 text-right font-mono"><HolderPctCell value={row.mid_holder_pct_change} positiveGood={true} /></td>
                                    <td className="py-2.5 px-2 text-right font-mono"><HolderPctCell value={row.big_holder_pct_change} positiveGood={true} /></td>
                                    <td className="py-2.5 px-2 text-right font-mono"><HolderPctCell value={row.whale_holder_pct_change} positiveGood={true} /></td>
                                    <td className="py-2.5 px-2 text-right font-mono whitespace-nowrap">
                                        {pi?.it_buy_5d != null ? (
                                            <span className={pi.it_buy_5d > 0 ? 'text-rose-600 dark:text-rose-400' : pi.it_buy_5d < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500'}>
                                                {pi.it_buy_5d > 0 ? '+' : ''}{pi.it_buy_5d.toLocaleString()}
                                            </span>
                                        ) : '—'}
                                    </td>
                                    <td className="py-2.5 px-2 text-right font-mono text-gray-600 whitespace-nowrap">
                                        {pi?.amount != null && pi.amount > 0 ? `${(pi.amount / 1e8).toFixed(1)}億` : '—'}
                                    </td>
                                    <td className="py-2.5 px-2 text-right font-mono whitespace-nowrap">
                                        {(() => {
                                            const f = flowMap[row.stock_code];
                                            if (!f) return <span className="text-gray-300 dark:text-gray-600">—</span>;
                                            const isIn = f.direction === 'in';
                                            return (
                                                <span className={isIn ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-emerald-600 dark:text-emerald-400 font-semibold'}>
                                                    {isIn ? '+' : '-'}{fmtNt(f.nt)}
                                                </span>
                                            );
                                        })()}
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
