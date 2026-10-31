'use client';

import { useMemo, useState } from 'react';
import TradeSummary from './TradeSummary';
import TradeReturnColumns from './TradeReturnColumns';
import TradeIndustryTable from './TradeIndustryTable';
import TradeRecentExits from './TradeRecentExits';
import { shortStrategyLabel } from '@/lib/investment/strategyConsensusUtils';
import { summarizeTrades } from '@/lib/investment/strategyTradeUtils';
import type { StrategyTrade } from '@/lib/investment/strategyTradeUtils';

interface Props {
    trades: StrategyTrade[];
    /** 最新資料日，作為「近 60 天換出」的基準 */
    asOf: string | null;
    /** strategy_id → 完整策略名稱 */
    strategyLabels: Record<string, string>;
}

const ALL = 'all';

function optionClass(active: boolean): string {
    return `text-xs px-2 py-1 rounded-md transition-all ${
        active
            ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm font-medium'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
    }`;
}

/** 策略頁「換股後表現」：持有中正負報酬、產業彙總、近期換出；策略切換為 client state（不進 URL）。 */
export default function StrategyTradePerformancePanel({ trades, asOf, strategyLabels }: Props) {
    const [selected, setSelected] = useState<string>(ALL);

    const shortLabels = useMemo(() => {
        const ids = [...new Set(trades.map((t) => t.strategyId))];
        return Object.fromEntries(ids.map((id) => [id, shortStrategyLabel(strategyLabels[id] ?? id)]));
    }, [trades, strategyLabels]);

    const scoped = selected === ALL ? trades : trades.filter((t) => t.strategyId === selected);
    const summary = summarizeTrades(scoped, asOf ?? '');
    // 「全部」模式各列標所屬策略；單一策略模式不需要
    const tagLabels = selected === ALL ? shortLabels : undefined;

    return (
        <div className="glass-card rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">換股後表現</h2>
                {trades.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 bg-gray-100/70 dark:bg-gray-800/50 rounded-lg p-0.5">
                        {[ALL, ...Object.keys(shortLabels)].map((id) => (
                            <button
                                key={id}
                                type="button"
                                title={id === ALL ? undefined : strategyLabels[id] ?? id}
                                onClick={() => setSelected(id)}
                                className={optionClass(selected === id)}
                            >
                                {id === ALL ? '全部' : shortLabels[id]}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {trades.length === 0 || !asOf ? (
                <p className="text-xs text-gray-400">尚無換股後表現資料</p>
            ) : (
                <>
                    <TradeSummary summary={summary} strategyShortLabels={tagLabels} />
                    <TradeReturnColumns trades={scoped} strategyShortLabels={tagLabels} />
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <TradeIndustryTable trades={scoped} />
                        <TradeRecentExits trades={scoped} asOf={asOf} strategyShortLabels={tagLabels} />
                    </div>
                </>
            )}

            <p className="text-[11px] text-gray-400 border-t border-gray-100/50 pt-2">
                報酬自換股訊號隔日開盤起算，以還原股價計（含除權息），未計手續費與稅；以現行策略邏輯回推，策略規則調整時歷史紀錄會一併更新。
            </p>
        </div>
    );
}
