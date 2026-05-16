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
    return (
        <div className="glass-card rounded-xl p-5 space-y-3 animate-slide-up">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100 text-base">
                {strategy.description}
            </h2>
            <p className="text-xs text-gray-400">策略 ID: {strategy.id}</p>

            {strategy.stocks.length === 0 ? (
                <p className="text-sm text-gray-400">今日無選股</p>
            ) : (
                <ul className="divide-y divide-gray-100/50 dark:divide-gray-700/40">
                    {strategy.stocks.map((stock) => {
                        const badge = MOVEMENT_BADGE[stock.movement];
                        return (
                            <li
                                key={stock.stock_id}
                                className="flex items-center justify-between py-2"
                            >
                                <span className="font-mono text-sm text-gray-700 dark:text-gray-200">
                                    {stock.stock_id}
                                </span>
                                <div className="flex items-center gap-2">
                                    {stock.score !== null && (
                                        <span className="text-xs text-gray-400">
                                            {stock.score.toFixed(3)}
                                        </span>
                                    )}
                                    <span
                                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.className}`}
                                    >
                                        {badge.label}
                                    </span>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
