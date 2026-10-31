import { getStrategySignals } from '@/app/actions/getStrategySignals';
import { getFactorIC } from '@/app/actions/getFactorIC';
import type { FactorICRow } from '@/app/actions/getFactorIC';
import { getStrategyAnalytics } from '@/app/actions/getStrategyAnalytics';
import { getStrategySnapshots } from '@/app/actions/getStrategySnapshots';
import { getConsensusSignals } from '@/app/actions/getConsensusSignals';
import { getFanBreakoutSignals } from '@/app/actions/getFanBreakoutSignals';
import type { FanBreakoutRow } from '@/lib/investment/fanBreakout';
import type { ConsensusSignal } from '@/types';
import StrategySignalCard from '@/components/features/StrategySignalCard';
import StrategyAnalyticsPanel from '@/components/features/strategy/StrategyAnalyticsPanel';
import { StrategyMonitorCard } from '@/components/features/strategy/StrategyMonitorCard';
import { StrategyChartViewer } from '@/components/features/strategy/StrategyChartViewer';
import type { StrategyMonitorStock } from '@/components/features/strategy/StrategyMonitorCard';
import { parseStrategyView, resolveStrategyTitleDate } from '@/lib/investment/strategyUtils';
import type { MovementLabel, StrategySignalsResult } from '@/lib/investment/strategyUtils';
import type { StrategyAnalyticsData } from '@/app/actions/getStrategyAnalytics';
import StrategyViewTabs from '@/components/features/strategy/StrategyViewTabs';
import type { BareKSnapshot } from '@/app/api/investment/bare-k/[code]/route';
import MultiStrategyConsensusPanel from '@/components/features/strategy/MultiStrategyConsensusPanel';
import { getStrategyConsensusHistory } from '@/app/actions/getStrategyConsensusHistory';
import { getStrategyTradePerformance } from '@/app/actions/getStrategyTradePerformance';
import type { StrategyTradePerformanceData } from '@/app/actions/getStrategyTradePerformance';
import { getStrategyDescriptions } from '@/app/actions/strategyRegistry';
import StrategyTradePerformancePanel from '@/components/features/strategy/StrategyTradePerformancePanel';
import type { StrategyConsensusHistoryData } from '@/app/actions/getStrategyConsensusHistory';
import {
    buildConsensusHistory,
    buildMultiConsensusStocks,
    parseConsensusParams,
} from '@/lib/investment/strategyConsensusUtils';

export const dynamic = 'force-dynamic';

const STRATEGY_FACTORS: Record<string, string[]> = {
    super8888:      ['vol_breakout'],
    capital_layer:  ['rev_momentum_3_12', 'rsv_180', 'broker_force'],
    low_vol_cap:    ['rev_momentum_3_12', 'rsv_180', 'price_to_high_240'],
    broker_ranked:  ['rev_momentum_3_12', 'broker_force', 'rsv_180'],
    low_vol_alpha:  ['rev_momentum_3_12', 'rs_100'],
    trend_template: ['rsv_180', 'rs_100', 'price_to_high_240', 'rev_momentum_3_12', 'broker_force'],
};

function icForStrategy(allIC: FactorICRow[], strategyId: string): FactorICRow[] {
    const factors = new Set(STRATEGY_FACTORS[strategyId] ?? []);
    return allIC.filter((r) => factors.has(r.factor));
}

function buildMonitorStocks(
    result: StrategySignalsResult | null,
    analytics: StrategyAnalyticsData,
    consensusMap: Record<string, ConsensusSignal> = {},
): StrategyMonitorStock[] {
    // Build stock → strategies/movement/etfHolders from signals
    const signalMap = new Map<string, { strategies: string[]; movement: MovementLabel; etfHolders: string[] }>();
    if (result) {
        for (const strategy of result.strategies) {
            for (const stock of strategy.stocks) {
                if (!signalMap.has(stock.stock_id)) {
                    signalMap.set(stock.stock_id, {
                        strategies: [],
                        movement: stock.movement,
                        etfHolders: stock.etfHolders ?? [],
                    });
                }
                signalMap.get(stock.stock_id)!.strategies.push(strategy.id);
            }
        }
    }

    return analytics.stocks.map((s) => {
        const sig = signalMap.get(s.stock_id);
        const c = consensusMap[s.stock_id];
        return {
            stock_id: s.stock_id,
            name: s.stock_name ?? null,
            ret_1d: s.ret_1d,
            ret_5d: s.ret_5d,
            ret_20d: s.ret_20d,
            category: s.category ?? '其他',
            strategies: sig?.strategies ?? [],
            movement: sig?.movement ?? ('none' as MovementLabel),
            etfHolders: sig?.etfHolders ?? [],
            consensus_count: c?.consensus_count,
            fund_consec_days: c?.fund_consec_days,
        };
    });
}

export default async function StrategyPage({
    searchParams,
}: {
    searchParams: Promise<{ view?: string; cmin?: string; cview?: string; cwin?: string }>;
}) {
    const { view, cmin, cview, cwin } = await searchParams;
    const activeView = parseStrategyView(view);
    const isMonitor = activeView === 'monitor';
    const isChart = activeView === 'chart';
    const isTrades = activeView === 'trades';
    const isStrategy = activeView === 'strategy';
    const consensusParams = parseConsensusParams({ cmin, cview, cwin });
    const isConsensusChart = consensusParams.view === 'chart';
    // 近 N 天模式才額外查詢；最新模式由 getStrategySignals 結果直接推導
    const consensusWindow = consensusParams.window;
    const needsHistory = isStrategy && consensusWindow !== 'latest';
    // 策略卡片（因子 IC）只在策略視角、非共選圖表模式顯示
    const showsStrategyDetail = isStrategy && !isConsensusChart;

    // 換股後表現視角只查策略訊號（標題日期）與換股後表現
    const [result, allIC, analytics, rawConsensus, consensusHistory, tradePerformance] = await Promise.all([
        getStrategySignals(),
        showsStrategyDetail
            ? getFactorIC([...new Set(Object.values(STRATEGY_FACTORS).flat())], 12)
            : Promise.resolve<FactorICRow[]>([]),
        isTrades
            ? Promise.resolve<StrategyAnalyticsData | null>(null)
            : getStrategyAnalytics(),
        isTrades
            ? Promise.resolve({ signals: [] as ConsensusSignal[], date: null })
            : getConsensusSignals().catch(() => ({ signals: [], date: null })),
        needsHistory
            ? getStrategyConsensusHistory(consensusWindow)
            : Promise.resolve<StrategyConsensusHistoryData | null>(null),
        isTrades
            ? getStrategyTradePerformance()
            : Promise.resolve<StrategyTradePerformanceData | null>(null),
    ]);

    const consensusStocks = consensusHistory
        ? buildConsensusHistory(consensusHistory.rows, consensusHistory.stockInfo, consensusParams.minCount)
        : buildMultiConsensusStocks(result, consensusParams.minCount);
    const consensusStrategies = (result?.strategies ?? []).map((s) => ({
        id: s.id,
        label: s.description,
        date: s.date,
    }));

    const consensusMap: Record<string, ConsensusSignal> = {};
    for (const s of rawConsensus.signals) consensusMap[s.stock_id] = s;

    const monitorStocks = (isMonitor || isChart) && analytics ? buildMonitorStocks(result, analytics, consensusMap) : [];

    // 圖表視角才查快照與均線發散候選；後者失敗時只是不顯示發散脈絡
    const [snapshotMap, fanBreakout] = isChart
        ? await Promise.all([
              getStrategySnapshots(monitorStocks.map((s) => s.stock_id)),
              getFanBreakoutSignals().catch((e: unknown) => {
                  console.error('[StrategyPage] getFanBreakoutSignals', e);
                  return null;
              }),
          ])
        : [new Map<string, BareKSnapshot | null>(), null];

    const fanBreakoutByStock: Record<string, FanBreakoutRow> = {};
    if (fanBreakout && !fanBreakout.error) {
        for (const row of fanBreakout.rows) {
            if (row.date === fanBreakout.latestDate) fanBreakoutByStock[row.stockId] = row;
        }
    }
    const strategyLabels: Record<string, string> = Object.fromEntries(
        (result?.strategies ?? []).map((s) => [s.id, s.description]),
    );

    // 換股後表現不依賴當日訊號，不套用此提早返回
    if (!result && isStrategy) {
        return (
            <main className="max-w-4xl mx-auto px-4 py-8">
                <p className="text-gray-400 text-sm">尚無策略訊號資料，請稍後再試。</p>
            </main>
        );
    }

    return (
        <main className="max-w-[1400px] mx-auto px-4 py-6 space-y-4 animate-fade-in">
            {/* Header with view toggle */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-baseline gap-3">
                    <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                        策略選股中心
                    </h1>
                    <span className="text-sm text-gray-400">
                        資料日期：{resolveStrategyTitleDate(
                            activeView,
                            result?.date ?? null,
                            tradePerformance?.asOf ?? null,
                            analytics?.date ?? null,
                        )}
                    </span>
                </div>
                <StrategyViewTabs active={activeView} />
            </div>

            {isTrades ? (
                tradePerformance && (
                    <StrategyTradePerformancePanel
                        trades={tradePerformance.trades}
                        asOf={tradePerformance.asOf}
                        strategyLabels={getStrategyDescriptions()}
                    />
                )
            ) : isChart ? (
                /* Chart view: scroll viewer with BareK charts */
                monitorStocks.length === 0 ? (
                    <p className="text-gray-400 text-sm">本日無策略選股資料</p>
                ) : (
                    <StrategyChartViewer
                        stocks={monitorStocks}
                        snapshots={snapshotMap}
                        strategyLabels={strategyLabels}
                        fanBreakoutByStock={fanBreakoutByStock}
                    />
                )
            ) : isMonitor ? (
                /* Monitor view: individual stock cards */
                monitorStocks.length === 0 ? (
                    <p className="text-gray-400 text-sm">本日無策略選股資料。</p>
                ) : (
                    <>
                        <p className="text-xs text-gray-400">
                            共 {monitorStocks.length} 支策略股 · 漲跌幅來源：sector_strength_stocks
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                            {monitorStocks.map((stock, i) => (
                                <StrategyMonitorCard key={stock.stock_id} stock={stock} index={i} />
                            ))}
                        </div>
                    </>
                )
            ) : (
                /* Strategy view: original cards（共選圖表模式只留共選面板，避免長捲動圖表後再接卡片） */
                <>
                    {!isConsensusChart && analytics && analytics.stocks.length > 0 && (
                        <StrategyAnalyticsPanel data={analytics} />
                    )}

                    <MultiStrategyConsensusPanel
                        stocks={consensusStocks}
                        strategies={consensusStrategies}
                        latestDate={result?.date ?? null}
                        params={consensusParams}
                    />

                    {isConsensusChart ? null : !result || result.strategies.length === 0 ? (
                        <p className="text-gray-400 text-sm">本日無任何策略訊號。</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
                            {result.strategies.map((strategy) => (
                                <StrategySignalCard
                                    key={strategy.id}
                                    strategy={strategy}
                                    factorIC={icForStrategy(allIC, strategy.id)}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}

            <p className="text-xs text-gray-400 border-t border-gray-100/50 pt-3">
                營收條件以最新公告月份為準，月中換股前後數日可能存在滯後
            </p>
        </main>
    );
}
