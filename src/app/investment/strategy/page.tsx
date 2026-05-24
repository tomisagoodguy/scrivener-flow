import Link from 'next/link';
import { getStrategySignals } from '@/app/actions/getStrategySignals';
import { getFactorIC } from '@/app/actions/getFactorIC';
import type { FactorICRow } from '@/app/actions/getFactorIC';
import { getStrategyAnalytics } from '@/app/actions/getStrategyAnalytics';
import StrategySignalCard from '@/components/features/StrategySignalCard';
import StrategyAnalyticsPanel from '@/components/features/strategy/StrategyAnalyticsPanel';
import { StrategyMonitorCard } from '@/components/features/strategy/StrategyMonitorCard';
import type { StrategyMonitorStock } from '@/components/features/strategy/StrategyMonitorCard';
import type { MovementLabel, StrategySignalsResult } from '@/lib/investment/strategyUtils';
import type { StrategyAnalyticsData } from '@/app/actions/getStrategyAnalytics';

export const dynamic = 'force-dynamic';

const STRATEGY_FACTORS: Record<string, string[]> = {
    super8888:     ['vol_breakout'],
    capital_layer: ['rev_momentum_3_12', 'rsv_180', 'broker_force'],
    low_vol_cap:   ['rev_momentum_3_12', 'rsv_180', 'price_to_high_240'],
    broker_ranked: ['rev_momentum_3_12', 'broker_force', 'rsv_180'],
    low_vol_alpha: ['rev_momentum_3_12', 'rs_100'],
};

function icForStrategy(allIC: FactorICRow[], strategyId: string): FactorICRow[] {
    const factors = new Set(STRATEGY_FACTORS[strategyId] ?? []);
    return allIC.filter((r) => factors.has(r.factor));
}

function buildMonitorStocks(
    result: StrategySignalsResult | null,
    analytics: StrategyAnalyticsData,
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
        };
    });
}

export default async function StrategyPage({
    searchParams,
}: {
    searchParams: Promise<{ view?: string }>;
}) {
    const { view } = await searchParams;
    const isMonitor = view === 'monitor';

    const [result, allIC, analytics] = await Promise.all([
        getStrategySignals(),
        getFactorIC(
            [...new Set(Object.values(STRATEGY_FACTORS).flat())],
            12,
        ),
        getStrategyAnalytics(),
    ]);

    const monitorStocks = isMonitor ? buildMonitorStocks(result, analytics) : [];

    if (!result && !isMonitor) {
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
                        資料日期：{result?.date ?? analytics.date}
                    </span>
                </div>
                <div className="flex gap-1 bg-gray-100/70 dark:bg-gray-800/50 rounded-xl p-1">
                    <Link
                        href="/investment/strategy"
                        className={`text-sm px-3 py-1.5 rounded-lg transition-all ${
                            !isMonitor
                                ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm font-medium'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                    >
                        策略視角
                    </Link>
                    <Link
                        href="/investment/strategy?view=monitor"
                        className={`text-sm px-3 py-1.5 rounded-lg transition-all ${
                            isMonitor
                                ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm font-medium'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                    >
                        監控清單
                    </Link>
                </div>
            </div>

            {isMonitor ? (
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
                /* Strategy view: original cards */
                <>
                    {analytics.stocks.length > 0 && (
                        <StrategyAnalyticsPanel data={analytics} />
                    )}

                    {!result || result.strategies.length === 0 ? (
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
