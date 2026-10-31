import Link from 'next/link';
import StrategyTag from './StrategyTag';
import { formatMonthDay } from '@/lib/investment/strategyConsensusUtils';
import { formatReturnPct, recentExits, returnColorClass } from '@/lib/investment/strategyTradeUtils';
import type { StrategyTrade } from '@/lib/investment/strategyTradeUtils';

interface Props {
    trades: StrategyTrade[];
    asOf: string;
    /** 「全部」模式才傳：每列標策略簡稱 */
    strategyShortLabels?: Record<string, string>;
}

/** 近 60 天換出的股票：持有報酬與換出後至今報酬（檢驗「漲者恆漲」） */
export default function TradeRecentExits({ trades, asOf, strategyShortLabels }: Props) {
    const exits = recentExits(trades, asOf);
    if (exits.length === 0) return null;

    return (
        <div className="min-w-0 overflow-x-auto">
            <h3 className="mb-1 text-xs font-semibold text-gray-700 dark:text-gray-200">
                近 60 天換出 <span className="font-normal text-gray-400">{exits.length} 檔</span>
            </h3>
            <table data-testid="trade-exits" className="w-full text-xs tabular-nums">
                <thead>
                    <tr className="text-left text-[11px] text-gray-500 dark:text-gray-400">
                        <th className="py-1 font-normal">股票</th>
                        <th className="py-1 text-right font-normal">出場日</th>
                        <th className="py-1 text-right font-normal">持有報酬</th>
                        <th className="py-1 text-right font-normal">換出後</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100/70 dark:divide-gray-700/50">
                    {exits.map((t) => (
                        <tr key={`${t.strategyId}-${t.stockId}-${t.entrySignalDate}`}>
                            <td className="py-1">
                                <Link href={`/investment/stock/${t.stockId}`} className="hover:underline">
                                    <span className="text-gray-800 dark:text-gray-100">{t.name ?? ''}</span>{' '}
                                    <span className="text-gray-500 dark:text-gray-400">{t.stockId}</span>
                                </Link>
                                {strategyShortLabels?.[t.strategyId] && <StrategyTag label={strategyShortLabels[t.strategyId]} />}
                            </td>
                            <td className="py-1 text-right text-gray-600 dark:text-gray-300">
                                {t.exitDate ? formatMonthDay(t.exitDate) : '—'}
                            </td>
                            <td className={`py-1 text-right ${returnColorClass(t.holdingReturn)}`}>
                                {formatReturnPct(t.holdingReturn)}
                            </td>
                            <td className={`py-1 text-right font-medium ${returnColorClass(t.postExitReturn)}`}>
                                {formatReturnPct(t.postExitReturn)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
