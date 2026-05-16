import { getStrategySignals } from '@/app/actions/getStrategySignals';
import StrategySignalCard from '@/components/features/StrategySignalCard';

export const dynamic = 'force-dynamic';

export default async function StrategyPage() {
    const result = await getStrategySignals();

    if (!result) {
        return (
            <main className="max-w-4xl mx-auto px-4 py-8">
                <p className="text-gray-400 text-sm">尚無策略訊號資料，請稍後再試。</p>
            </main>
        );
    }

    return (
        <main className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
            <div className="flex items-baseline gap-3">
                <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                    策略選股中心
                </h1>
                <span className="text-sm text-gray-400">資料日期：{result.date}</span>
            </div>

            {result.strategies.length === 0 ? (
                <p className="text-gray-400 text-sm">本日無任何策略訊號。</p>
            ) : (
                <div className="space-y-5">
                    {result.strategies.map((strategy) => (
                        <StrategySignalCard key={strategy.id} strategy={strategy} />
                    ))}
                </div>
            )}

            <p className="text-xs text-gray-400 border-t border-gray-100/50 pt-4">
                營收條件以最新公告月份為準，月中換股前後數日可能存在滯後
            </p>
        </main>
    );
}
