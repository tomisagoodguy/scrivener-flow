import Link from 'next/link';
import type { MovementLabel } from '@/lib/investment/strategyUtils';
import { getEtfMeta } from '@/lib/investment/etfRegistry';

export interface StrategyMonitorStock {
    stock_id: string;
    name: string | null;
    ret_1d: number | null;
    ret_5d: number | null;
    ret_20d: number | null;
    category: string;
    strategies: string[];
    movement: MovementLabel;
    etfHolders: string[];
    consensus_count?: number;
    fund_consec_days?: number;
}

const STRATEGY_SHORT: Record<string, string> = {
    super8888:      'S8888',
    capital_layer:  'Capital',
    broker_ranked:  'Broker',
    low_vol_alpha:  'α年增率',
    low_vol_cap:    'LowVol',
    trend_template: 'Trend',
};

const MOVEMENT_BADGE: Record<MovementLabel, { label: string; className: string }> = {
    adding:   { label: '加碼中', className: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
    reducing: { label: '減碼中', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    holding:  { label: '持倉中', className: 'bg-gray-200/60 text-gray-600 dark:text-gray-400' },
    none:     { label: '未持有', className: 'bg-slate-100/60 text-slate-500 dark:bg-slate-600/70 dark:text-slate-300' },
};

function RetPill({ val, label }: { val: number | null; label: string }) {
    if (val === null) return <span className="text-[11px] text-gray-300">{label} —</span>;
    const up = val >= 0;
    return (
        <span className={`text-[11px] font-medium ${up ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {label} {up ? '+' : ''}{(val * 100).toFixed(1)}%
        </span>
    );
}

export function StrategyMonitorCard({ stock, index }: { stock: StrategyMonitorStock; index: number }) {
    const badge = MOVEMENT_BADGE[stock.movement];
    const uniqueEtfs = [...new Set(stock.etfHolders)];
    const isTriple = (stock.consensus_count ?? 0) >= 3;

    return (
        <div
            className="animate-slide-up"
            style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
        >
            <Link
                href={`/investment/stock/${stock.stock_id}`}
                className={`glass-card block rounded-2xl p-4 hover:shadow-md transition-all h-full${isTriple ? ' ring-1 ring-amber-400/60' : ''}`}
            >
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0">
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                            <span className="font-bold text-gray-800 dark:text-gray-100 text-base">{stock.stock_id}</span>
                            {stock.name && (
                                <span className="text-sm text-gray-500 dark:text-gray-400 truncate">{stock.name}</span>
                            )}
                        </div>
                        {stock.category && (
                            <span className="text-[11px] text-gray-400 dark:text-gray-500">{stock.category}</span>
                        )}
                    </div>
                    <div className="text-right shrink-0 ml-2 space-y-0.5">
                        <div><RetPill val={stock.ret_1d} label="1d" /></div>
                        <div><RetPill val={stock.ret_5d} label="5d" /></div>
                    </div>
                </div>

                {/* Strategy badges */}
                <div className="flex flex-wrap gap-1 mb-2">
                    {stock.strategies.map((sid) => (
                        <span
                            key={sid}
                            className="text-[10px] px-1.5 py-0.5 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-700/50 rounded-full"
                        >
                            {STRATEGY_SHORT[sid] ?? sid}
                        </span>
                    ))}
                </div>

                {/* Fund momentum + consensus badges */}
                {((stock.fund_consec_days ?? 0) >= 1 || (stock.consensus_count ?? 0) >= 2) && (
                    <div className="flex items-center gap-1 flex-wrap mb-1.5">
                        {(stock.fund_consec_days ?? 0) >= 1 && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-700/50 rounded-full">
                                投信 {stock.fund_consec_days}d
                            </span>
                        )}
                        {(stock.consensus_count ?? 0) >= 2 && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${
                                stock.consensus_count === 3
                                    ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700/50'
                                    : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-700/50'
                            }`}>
                                共識 {'★'.repeat(stock.consensus_count ?? 0)}
                            </span>
                        )}
                    </div>
                )}

                {/* Movement + ETF holders */}
                <div className="flex items-center gap-1 flex-wrap">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${badge.className}`}>
                        {badge.label}
                    </span>
                    {uniqueEtfs.slice(0, 3).map((etfCode) => {
                        const meta = getEtfMeta(etfCode);
                        if (!meta) return null;
                        return (
                            <span
                                key={etfCode}
                                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium text-white"
                                style={{ backgroundColor: meta.color }}
                                title={meta.name}
                            >
                                {meta.shortCode}
                            </span>
                        );
                    })}
                    {uniqueEtfs.length > 3 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200/60 text-gray-500 dark:bg-gray-700/60 dark:text-gray-400">
                            +{uniqueEtfs.length - 3}
                        </span>
                    )}
                </div>
            </Link>
        </div>
    );
}
