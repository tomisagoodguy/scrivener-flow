import Link from 'next/link';
import type { EquityRow, PriceIndicator, SortKey, SortDir, FlowEntry } from '@/lib/investment/equityPageData';
import { HighBadge } from './HighBadge';
import { HolderPctCell } from './HolderPctCell';
import { SortableHeader } from './SortableHeader';
import { EtfBadge } from './EtfBadge';

function fmtNt(nt: number): string {
    const abs = Math.abs(nt);
    if (abs >= 1e8) return `${(nt / 1e8).toFixed(1)}億`;
    return `${(nt / 1e4).toFixed(0)}萬`;
}

export function RankingTable({
    rows,
    source,
    priceIndicators,
    currentSort,
    currentDir,
    etfMap = {},
    flowMap = {},
}: {
    rows: EquityRow[];
    source: 'equity' | 'equity-retail';
    priceIndicators: Record<string, PriceIndicator>;
    currentSort: SortKey | null;
    currentDir: SortDir;
    etfMap?: Record<string, string[]>;
    flowMap?: Record<string, FlowEntry>;
}) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-xs">
                <thead>
                    <tr className="border-b border-gray-200/60 text-[11px] text-gray-500 uppercase tracking-wide">
                        <th className="text-left py-2 px-2 w-6">#</th>
                        <th className="text-left py-2 px-2">股票</th>
                        <th className="text-right py-2 px-2"><SortableHeader label="股東數" sortKey="total_shareholders" currentSort={currentSort} currentDir={currentDir} /></th>
                        <th className="text-right py-2 px-2"><SortableHeader label="人數增減" sortKey="shareholders_change_rate" currentSort={currentSort} currentDir={currentDir} /></th>
                        <th className="text-right py-2 px-2"><SortableHeader label="200張+" sortKey="mid_holder_pct_change" currentSort={currentSort} currentDir={currentDir} /></th>
                        <th className="text-right py-2 px-2"><SortableHeader label="400張+" sortKey="big_holder_pct_change" currentSort={currentSort} currentDir={currentDir} /></th>
                        <th className="text-right py-2 px-2"><SortableHeader label="1000張+" sortKey="whale_holder_pct_change" currentSort={currentSort} currentDir={currentDir} /></th>
                        <th className="text-right py-2 px-2"><SortableHeader label="投信五日" sortKey="it_buy_5d" currentSort={currentSort} currentDir={currentDir} /></th>
                        <th className="text-right py-2 px-2"><SortableHeader label="成交額" sortKey="amount" currentSort={currentSort} currentDir={currentDir} /></th>
                        <th className="text-right py-2 px-2 text-[11px] text-gray-500 uppercase tracking-wide">ETF流</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => {
                        const shrChangeVal = row.shareholders_change_rate;
                        const pi = priceIndicators[row.stock_code];
                        const cellBg = pi?.is_200d_high ? 'bg-rose-100' : pi?.is_20d_high ? 'bg-amber-100' : '';
                        return (
                            <tr key={row.stock_code} className="border-b border-gray-200/60 hover:brightness-95 transition-all">
                                <td className={`py-2.5 px-2 text-gray-400 font-mono ${cellBg}`}>{i + 1}</td>
                                <td className={`py-2.5 px-2 ${cellBg}`}>
                                    <div className="flex items-center gap-1 flex-wrap">
                                        <Link href={`/investment/stock/${row.stock_code}?source=${source}`} className="font-semibold text-gray-800 dark:text-gray-200 hover:text-blue-600 transition-colors text-xs">
                                            {row.stock_name || row.stock_code}
                                        </Link>
                                        {row.stock_name && <span className="text-[10px] text-gray-400">{row.stock_code}</span>}
                                        {pi && <HighBadge is200d={pi.is_200d_high} is20d={pi.is_20d_high} />}
                                        {(etfMap[row.stock_code] ?? []).map(code => (
                                            <EtfBadge key={code} etfCode={code} />
                                        ))}
                                        {row.mid_holder_pct_change != null && row.mid_holder_pct_change > 0 &&
                                         row.big_holder_pct_change != null && row.big_holder_pct_change > 0 &&
                                         row.whale_holder_pct_change != null && row.whale_holder_pct_change > 0 && (
                                            <span className="inline-block ml-0.5 px-1.5 py-0.5 text-[10px] font-bold rounded bg-violet-500 text-white leading-none">三全↑</span>
                                        )}
                                    </div>
                                </td>
                                <td className={`py-2.5 px-2 text-right text-gray-700 dark:text-gray-300 font-mono ${cellBg}`}>{row.total_shareholders != null ? row.total_shareholders.toLocaleString() : '—'}</td>
                                <td className={`py-2.5 px-2 text-right font-mono ${cellBg}`}>
                                    {shrChangeVal != null ? (
                                        <span className={shrChangeVal < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                                            {shrChangeVal > 0 ? '+' : ''}{shrChangeVal.toFixed(2)}%
                                        </span>
                                    ) : '—'}
                                </td>
                                <td className={`py-2.5 px-2 text-right font-mono ${cellBg}`}><HolderPctCell value={row.mid_holder_pct_change} positiveGood={true} /></td>
                                <td className={`py-2.5 px-2 text-right font-mono ${cellBg}`}><HolderPctCell value={row.big_holder_pct_change} positiveGood={true} /></td>
                                <td className={`py-2.5 px-2 text-right font-mono ${cellBg}`}><HolderPctCell value={row.whale_holder_pct_change} positiveGood={true} /></td>
                                <td className={`py-2.5 px-2 text-right font-mono whitespace-nowrap ${cellBg}`}>
                                    {pi?.it_buy_5d != null ? (
                                        <span className={pi.it_buy_5d > 0 ? 'text-rose-600 dark:text-rose-400' : pi.it_buy_5d < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500'}>
                                            {pi.it_buy_5d > 0 ? '+' : ''}{pi.it_buy_5d.toLocaleString()}
                                        </span>
                                    ) : '—'}
                                </td>
                                <td className={`py-2.5 px-2 text-right font-mono text-gray-600 dark:text-gray-400 whitespace-nowrap ${cellBg}`}>
                                    {pi?.amount != null && pi.amount > 0 ? `${(pi.amount / 1e8).toFixed(1)}億` : '—'}
                                </td>
                                <td className={`py-2.5 px-2 text-right font-mono whitespace-nowrap ${cellBg}`}>
                                    {(() => {
                                        const f = flowMap[row.stock_code];
                                        if (!f) return <span className="text-gray-300 dark:text-gray-600">—</span>;
                                        const isIn = f.direction === 'in';
                                        return (
                                            <span className={isIn ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
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
    );
}
