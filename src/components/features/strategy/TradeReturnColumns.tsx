import Link from 'next/link';
import StrategyTag from './StrategyTag';
import { formatReturnPct, holdingDays, returnColorClass, splitByReturn } from '@/lib/investment/strategyTradeUtils';
import type { StrategyTrade } from '@/lib/investment/strategyTradeUtils';

interface Props {
    trades: StrategyTrade[];
    /** 「全部」模式才傳：每列標策略簡稱 */
    strategyShortLabels?: Record<string, string>;
}

function TradeRow({ trade, strategyLabel }: { trade: StrategyTrade; strategyLabel?: string }) {
    const days = holdingDays(trade);
    return (
        <li className="flex items-center justify-between gap-2 py-1 text-xs">
            <Link href={`/investment/stock/${trade.stockId}`} className="min-w-0 truncate hover:underline">
                <span className="text-gray-800 dark:text-gray-100">{trade.name ?? ''}</span>{' '}
                <span data-testid="trade-code" className="text-gray-500 dark:text-gray-400">{trade.stockId}</span>
                {trade.industry && <span className="ml-1 text-gray-400">{trade.industry}</span>}
                {strategyLabel && <StrategyTag label={strategyLabel} />}
            </Link>
            <span className="flex shrink-0 items-center gap-2 tabular-nums">
                {days !== null && <span className="text-gray-400">{days} 天</span>}
                <span className={`font-medium ${returnColorClass(trade.holdingReturn)}`}>
                    {formatReturnPct(trade.holdingReturn)}
                </span>
            </span>
        </li>
    );
}

function Column({ title, testId, trades, strategyShortLabels }: Props & { title: string; testId: string }) {
    return (
        <div data-testid={testId} className="min-w-0">
            <h3 className="mb-1 text-xs font-semibold text-gray-700 dark:text-gray-200">
                {title} <span className="font-normal text-gray-400">{trades.length} 檔</span>
            </h3>
            {trades.length === 0 ? (
                <p className="text-xs text-gray-400">無</p>
            ) : (
                <ul className="divide-y divide-gray-100/70 dark:divide-gray-700/50">
                    {trades.map((t) => (
                        <TradeRow
                            key={`${t.strategyId}-${t.stockId}-${t.entrySignalDate}`}
                            trade={t}
                            strategyLabel={strategyShortLabels?.[t.strategyId]}
                        />
                    ))}
                </ul>
            )}
        </div>
    );
}

/** 持有中個股分正報酬／負報酬兩欄 */
export default function TradeReturnColumns({ trades, strategyShortLabels }: Props) {
    const { positive, negative } = splitByReturn(trades);
    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Column title="正報酬" testId="trade-positive" trades={positive} strategyShortLabels={strategyShortLabels} />
            <Column title="負報酬" testId="trade-negative" trades={negative} strategyShortLabels={strategyShortLabels} />
        </div>
    );
}
