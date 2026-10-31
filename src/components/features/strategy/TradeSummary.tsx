import StrategyTag from './StrategyTag';
import { formatReturnPct, returnColorClass } from '@/lib/investment/strategyTradeUtils';
import type { TradeSummary as Summary } from '@/lib/investment/strategyTradeUtils';

function Stat({ label, value, className = 'text-gray-800 dark:text-gray-100' }: { label: string; value: string; className?: string }) {
    return (
        <div className="flex flex-col">
            <span className="text-[11px] text-gray-500 dark:text-gray-400">{label}</span>
            <span className={`text-sm font-semibold tabular-nums ${className}`}>{value}</span>
        </div>
    );
}

interface Props {
    summary: Summary;
    /** 「全部」模式才傳：待進場清單標策略簡稱 */
    strategyShortLabels?: Record<string, string>;
}

/** 持有中摘要（檔數、平均報酬、勝率）＋近 60 天換出摘要＋待進場清單 */
export default function TradeSummary({ summary, strategyShortLabels }: Props) {
    return (
        <div className="space-y-2">
            <div data-testid="trade-summary" className="flex flex-wrap gap-x-6 gap-y-2">
                <Stat label="持有中" value={`${summary.openCount} 檔`} />
                <Stat
                    label="平均持有報酬"
                    value={formatReturnPct(summary.avgReturn)}
                    className={returnColorClass(summary.avgReturn)}
                />
                <Stat label="勝率" value={formatReturnPct(summary.winRate, 1)} />
                <Stat label="近 60 天換出" value={`${summary.exitCount} 檔`} />
                <Stat
                    label="換出後平均報酬"
                    value={formatReturnPct(summary.avgPostExitReturn)}
                    className={returnColorClass(summary.avgPostExitReturn)}
                />
            </div>
            {summary.pending.length > 0 && (
                <p data-testid="trade-pending" className="text-[11px] text-gray-500 dark:text-gray-400">
                    待進場（隔日開盤後計算）：
                    {summary.pending.map((t) => (
                        <span key={`${t.strategyId}-${t.stockId}`} className="ml-2">
                            {t.name ?? ''} <span>{t.stockId}</span>
                            {strategyShortLabels?.[t.strategyId] && <StrategyTag label={strategyShortLabels[t.strategyId]} />}
                        </span>
                    ))}
                </p>
            )}
        </div>
    );
}
