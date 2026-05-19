import { getStrategySignals } from '@/app/actions/getStrategySignals';
import { getFactorIC } from '@/app/actions/getFactorIC';
import type { FactorICRow } from '@/app/actions/getFactorIC';
import StrategySignalCard from '@/components/features/StrategySignalCard';

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

export default async function StrategyPage() {
    const [result, allIC] = await Promise.all([
        getStrategySignals(),
        getFactorIC(
            [...new Set(Object.values(STRATEGY_FACTORS).flat())],
            12,
        ),
    ]);

    if (!result) {
        return (
            <main className="max-w-4xl mx-auto px-4 py-8">
                <p className="text-gray-400 text-sm">尚無策略訊號資料，請稍後再試。</p>
            </main>
        );
    }

    return (
        <main className="max-w-[1400px] mx-auto px-4 py-6 space-y-4 animate-fade-in">
            <div className="flex items-baseline gap-3">
                <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                    策略選股中心
                </h1>
                <span className="text-sm text-gray-400">資料日期：{result.date}</span>
            </div>

            {result.strategies.length === 0 ? (
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

            <p className="text-xs text-gray-400 border-t border-gray-100/50 pt-3">
                營收條件以最新公告月份為準，月中換股前後數日可能存在滯後
            </p>
        </main>
    );
}
