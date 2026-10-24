import Link from 'next/link';
import { getEtfMeta } from '@/lib/investment/etfRegistry';
import { formatMonthDay, shortStrategyLabel } from '@/lib/investment/strategyConsensusUtils';
import type { MultiConsensusEntry } from '@/lib/investment/strategyConsensusUtils';
import type { MovementLabel } from '@/lib/investment/strategyUtils';

const MOVEMENT_BADGE: Record<MovementLabel, { label: string; className: string }> = {
    adding:   { label: '加碼中', className: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
    reducing: { label: '減碼中', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    holding:  { label: '持倉中', className: 'bg-gray-200/60 text-gray-600 dark:text-gray-400' },
    none:     { label: '未持有', className: 'bg-slate-100/60 text-slate-500 dark:bg-slate-600/70 dark:text-slate-300' },
};

function EtfHolderBadges({ holders }: { holders: string[] }) {
    const unique = [...new Set(holders)];
    const visible = unique.slice(0, 3);
    const rest = unique.length - visible.length;
    return (
        <>
            {visible.map((etfCode) => {
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
            {rest > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-gray-300/70 text-gray-600 dark:bg-gray-600/70 dark:text-gray-300">
                    +{rest}
                </span>
            )}
        </>
    );
}

export default function ConsensusStockChip({ stock }: { stock: MultiConsensusEntry }) {
    const badge = stock.movement ? MOVEMENT_BADGE[stock.movement] : null;
    return (
        <Link
            href={`/investment/stock/${stock.stock_id}`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/60 dark:bg-gray-800/50 border border-white/50 dark:border-gray-700/50 hover:bg-white/80 dark:hover:bg-gray-700/60 transition-colors flex-wrap"
        >
            <span className="font-mono text-sm font-medium text-gray-800 dark:text-gray-100">
                {stock.stock_id}
            </span>
            {stock.name && (
                <span className="text-xs text-gray-500 dark:text-gray-400">{stock.name}</span>
            )}
            <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400">
                {stock.count} 策略
            </span>
            {stock.strategies.map((s) => (
                <span
                    key={s.id}
                    title={s.label}
                    className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                >
                    {shortStrategyLabel(s.label)}
                </span>
            ))}
            {stock.industry && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300">
                    {stock.industry}
                </span>
            )}
            {stock.etfHolders && <EtfHolderBadges holders={stock.etfHolders} />}
            {badge && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${badge.className}`}>
                    {badge.label}
                </span>
            )}
            {stock.lastDate && (
                <span className="text-[10px] text-gray-400" title="最後選中日期">
                    {formatMonthDay(stock.lastDate)}
                </span>
            )}
        </Link>
    );
}
