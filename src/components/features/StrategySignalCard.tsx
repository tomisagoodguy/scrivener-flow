import Link from 'next/link';
import type { StrategyEntry, MovementLabel } from '@/lib/investment/strategyUtils';

interface Props {
    strategy: StrategyEntry;
}

const MOVEMENT_BADGE: Record<MovementLabel, { label: string; className: string }> = {
    adding:   { label: '加碼中', className: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
    reducing: { label: '減碼中', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    holding:  { label: '持倉中', className: 'bg-gray-200/60 text-gray-600 dark:text-gray-400' },
    none:     { label: '未持有', className: 'bg-slate-100/60 text-slate-500 dark:text-slate-400' },
};

export default function StrategySignalCard({ strategy }: Props) {
    const consensusCount = strategy.stocks.filter((s) => s.movement === 'adding').length;
    const encodedStockList = encodeURIComponent(strategy.stocks.map((s) => s.stock_id).join(','));
    const fromLabel = encodeURIComponent(`策略:${strategy.description}`);

    return (
        <div className="glass-card rounded-xl p-5 space-y-3 animate-slide-up">
            <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-800 dark:text-gray-100 text-base">
                    {strategy.description}
                </h2>
                {consensusCount > 0 && (
                    <span className="flex items-center gap-1 text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full">
                        <span>🔥</span>
                        <span>瑤姊共識 {consensusCount} 支</span>
                    </span>
                )}
            </div>
            <p className="text-xs text-gray-400">策略 ID: {strategy.id}</p>

            {strategy.stocks.length === 0 ? (
                <p className="text-sm text-gray-400">今日無選股</p>
            ) : (
                <ul className="divide-y divide-gray-100/50 dark:divide-gray-700/40">
                    {strategy.stocks.map((stock, idx) => {
                        const badge = MOVEMENT_BADGE[stock.movement];
                        const isConsensus = stock.movement === 'adding';
                        const href = `/investment/stock/${stock.stock_id}?from=${fromLabel}&rank=${idx + 1}&list=${encodedStockList}`;
                        return (
                            <li key={stock.stock_id}>
                                <Link
                                    href={href}
                                    className={`flex items-center justify-between py-2 px-2 -mx-2 rounded-lg transition-colors hover:bg-gray-100/60 dark:hover:bg-gray-700/40 ${
                                        isConsensus ? 'bg-rose-500/10 dark:bg-rose-500/10' : ''
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        {isConsensus && (
                                            <span className="text-rose-500 text-xs leading-none">▶</span>
                                        )}
                                        <span className={`font-mono text-sm ${isConsensus ? 'text-rose-700 dark:text-rose-300 font-semibold' : 'text-gray-700 dark:text-gray-200'}`}>
                                            {stock.stock_id}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {stock.score !== null && (
                                            <span className="text-xs text-gray-400">
                                                {stock.score.toFixed(3)}
                                            </span>
                                        )}
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.className}`}>
                                            {badge.label}
                                        </span>
                                    </div>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
