import Link from 'next/link';
import { buildConsensusMatrix, formatMonthDay, shortStrategyLabel } from '@/lib/investment/strategyConsensusUtils';
import type { MultiConsensusEntry } from '@/lib/investment/strategyConsensusUtils';

interface Props {
    stocks: MultiConsensusEntry[];
    /** 僅最新模式提供：strategy_id → 資料日期 */
    strategyDates?: Record<string, string>;
}

// 選中標記用 inline 背景，避免 dark-theme.css 對 .rounded-* 的 !important 覆蓋
const MARKER_STYLE = { backgroundColor: '#f59e0b' };

export default function ConsensusMatrix({ stocks, strategyDates }: Props) {
    if (stocks.length === 0) {
        return <p className="text-xs text-gray-400">目前條件下無共選股</p>;
    }

    const { columns, rows } = buildConsensusMatrix(stocks, strategyDates);

    return (
        <div className="overflow-x-auto">
            <table className="text-xs border-collapse min-w-full">
                <thead>
                    <tr className="text-gray-500 dark:text-gray-400">
                        <th className="text-left font-medium px-2 py-1.5 sticky left-0 bg-white/80 dark:bg-slate-900/80">股票</th>
                        {columns.map((c) => (
                            <th key={c.id} className="font-medium px-2 py-1.5 whitespace-nowrap text-center" title={c.label}>
                                <div>{shortStrategyLabel(c.label)}</div>
                                {c.date && <div className="text-[10px] text-gray-400 font-normal">{formatMonthDay(c.date)}</div>}
                            </th>
                        ))}
                        <th className="font-medium px-2 py-1.5 text-center">數量</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(({ entry, cells }) => (
                        <tr key={entry.stock_id} className="border-t border-gray-100/60 dark:border-gray-700/50">
                            <th className="text-left font-normal px-2 py-1.5 whitespace-nowrap sticky left-0 bg-white/80 dark:bg-slate-900/80">
                                <Link href={`/investment/stock/${entry.stock_id}`} className="hover:underline">
                                    <span className="font-mono font-medium text-gray-800 dark:text-gray-100">{entry.stock_id}</span>
                                    {entry.name && <span className="ml-1 text-gray-500 dark:text-gray-400">{entry.name}</span>}
                                </Link>
                            </th>
                            {cells.map((selected, i) => (
                                <td key={columns[i].id} className="px-2 py-1.5 text-center">
                                    {selected && (
                                        <span
                                            aria-label="已選中"
                                            className="inline-block w-3 h-3 rounded-sm"
                                            style={MARKER_STYLE}
                                        />
                                    )}
                                </td>
                            ))}
                            <td className="px-2 py-1.5 text-center font-semibold text-amber-700 dark:text-amber-400">
                                {entry.count}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
