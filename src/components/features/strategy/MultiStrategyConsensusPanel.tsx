import ConsensusControls from './ConsensusControls';
import ConsensusStockChip from './ConsensusStockChip';
import ConsensusMatrix from './ConsensusMatrix';
import ConsensusChartViewer from './ConsensusChartViewer';
import { formatMonthDay, shortStrategyLabel } from '@/lib/investment/strategyConsensusUtils';
import type { ConsensusParams, MultiConsensusEntry } from '@/lib/investment/strategyConsensusUtils';
export type { MultiConsensusEntry } from '@/lib/investment/strategyConsensusUtils';

export interface ConsensusStrategyDate {
    id: string;
    label: string;
    date: string;
}

interface Props {
    stocks: MultiConsensusEntry[];
    /** 參與的策略（取自 getStrategySignals 結果），含各自資料日期 */
    strategies: ConsensusStrategyDate[];
    /** 頂層最新日期；早於此日期的策略以 muted 樣式標示 */
    latestDate: string | null;
    params: ConsensusParams;
}

function StrategyDateLine({ strategies, latestDate }: Pick<Props, 'strategies' | 'latestDate'>) {
    return (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400">
            {strategies.map((s) => (
                <span key={s.id} title={s.label}>
                    {shortStrategyLabel(s.label)}{' '}
                    <span className={latestDate && s.date < latestDate ? 'text-gray-400' : 'text-gray-700 dark:text-gray-200'}>
                        {formatMonthDay(s.date)}
                    </span>
                </span>
            ))}
        </div>
    );
}

export default function MultiStrategyConsensusPanel({ stocks, strategies, latestDate, params }: Props) {
    if (strategies.length < 2) return null;

    const isLatest = params.window === 'latest';
    const strategyDates = isLatest ? Object.fromEntries(strategies.map((s) => [s.id, s.date])) : undefined;

    const isChart = params.view === 'chart';

    const card = (
        <div className="glass-card rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">多策略共選</h2>
                    <span className="text-xs text-gray-400">{stocks.length} 支</span>
                </div>
                <ConsensusControls params={params} />
            </div>

            {isLatest ? (
                <StrategyDateLine strategies={strategies} latestDate={latestDate} />
            ) : (
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    統計區間：近 {params.window} 天（不同策略數）
                </p>
            )}

            {isChart ? null : params.view === 'matrix' ? (
                <ConsensusMatrix stocks={stocks} strategyDates={strategyDates} />
            ) : stocks.length === 0 ? (
                <p className="text-xs text-gray-400">目前條件下無共選股</p>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {stocks.map((stock) => (
                        <ConsensusStockChip key={stock.stock_id} stock={stock} />
                    ))}
                </div>
            )}
        </div>
    );

    if (!isChart) return card;

    // 圖表放在卡片外：連續捲動檢視器自帶 sticky 子導覽列與各段 glass-card
    return (
        <div>
            {card}
            <ConsensusChartViewer stocks={stocks} params={params} />
        </div>
    );
}
