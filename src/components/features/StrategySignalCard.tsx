'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { StrategyEntry, MovementLabel } from '@/lib/investment/strategyUtils';
import type { FactorICRow } from '@/app/actions/getFactorIC';
import { getEtfMeta } from '@/lib/investment/etfRegistry';
import FactorICSparkline from './FactorICSparkline';

interface Props {
    strategy: StrategyEntry;
    factorIC?: FactorICRow[];
}

const MOVEMENT_BADGE: Record<MovementLabel, { label: string; className: string }> = {
    adding:   { label: '加碼中', className: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
    reducing: { label: '減碼中', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    holding:  { label: '持倉中', className: 'bg-gray-200/60 text-gray-600 dark:text-gray-400' },
    none:     { label: '未持有', className: 'movement-none-badge bg-slate-100/60 text-slate-500 dark:text-slate-400' },
};

const FACTOR_LABELS: Record<string, string> = {
    rev_momentum_3_12: '營收動能',
    rsv_180:           'RSV180',
    rs_100:            'RS100',
    ma_trend_score:    '均線趨勢',
    broker_force:      '主力籌碼',
    vol_breakout:      '量能突破',
    smallcap_pct:      '小市值',
    price_to_high_240: '近高點',
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
                <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-gray-300/70 text-gray-600 dark:bg-gray-600/70 dark:text-gray-300"
                    title={unique.slice(3).map((c) => getEtfMeta(c)?.shortCode ?? c).join(', ')}
                >
                    +{rest}
                </span>
            )}
        </>
    );
}

function formatTurnoverYi(avgTurnover: number): string {
    return `${(avgTurnover / 100_000_000).toFixed(1)} 億`;
}

function icBadgeClass(ic: number | null): string {
    if (ic === null) return 'bg-gray-100/60 text-gray-400';
    if (ic >= 0.04) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    if (ic >= 0.02) return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
    return 'bg-rose-500/10 text-rose-600 dark:text-rose-400';
}

export default function StrategySignalCard({ strategy, factorIC }: Props) {
    const [expandedFactor, setExpandedFactor] = useState<string | null>(null);

    const consensusCount = strategy.stocks.filter((s) => s.movement === 'adding').length;
    const encodedStockList = encodeURIComponent(strategy.stocks.map((s) => s.stock_id).join(','));
    const fromLabel = encodeURIComponent(`策略:${strategy.description}`);

    const factorMap = useMemo(() => {
        const map = new Map<string, FactorICRow[]>();
        for (const row of factorIC ?? []) {
            if (!map.has(row.factor)) map.set(row.factor, []);
            map.get(row.factor)!.push(row);
        }
        return map;
    }, [factorIC]);

    const factorKeys = useMemo(
        () => [...factorMap.keys()].filter((k) => factorMap.get(k)!.some((r) => r.ic_20d !== null)),
        [factorMap],
    );

    const toggleFactor = (key: string) =>
        setExpandedFactor((prev) => (prev === key ? null : key));

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
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        {isConsensus && (
                                            <span className="text-rose-500 text-xs leading-none">▶</span>
                                        )}
                                        <span className={`font-mono text-sm ${isConsensus ? 'text-rose-700 dark:text-rose-300 font-semibold' : 'text-gray-700 dark:text-gray-200'}`}>
                                            {stock.stock_id}{stock.name ? ` ${stock.name}` : ''}
                                        </span>
                                        {stock.industry && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300">
                                                {stock.industry}
                                            </span>
                                        )}
                                        <EtfHolderBadges holders={stock.etfHolders ?? []} />
                                        {stock.liquidity_flag === true && (
                                            <span
                                                className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                                title={stock.avg_turnover !== null ? `日均成交值 ${formatTurnoverYi(stock.avg_turnover)}元` : undefined}
                                            >
                                                低流動
                                                {stock.avg_turnover !== null && ` · ${formatTurnoverYi(stock.avg_turnover)}`}
                                            </span>
                                        )}
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

            {factorKeys.length > 0 && (
                <div className="pt-2 border-t border-gray-100/50 dark:border-gray-700/40 space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                        {factorKeys.map((key) => {
                            const sparkRows = [...factorMap.get(key)!].sort((a, b) => a.month.localeCompare(b.month));
                            const latest = sparkRows[sparkRows.length - 1];
                            const hasSparkline = sparkRows.filter((r) => r.ic_20d !== null).length >= 3;
                            return (
                                <button
                                    key={key}
                                    onClick={() => toggleFactor(key)}
                                    disabled={!hasSparkline}
                                    className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${icBadgeClass(latest?.ic_20d ?? null)} ${hasSparkline ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                                    title={hasSparkline ? '點擊展開 12 個月走勢' : '資料不足，無法展開'}
                                >
                                    {FACTOR_LABELS[key] ?? key} {latest?.ic_20d != null ? latest.ic_20d.toFixed(3) : '—'}
                                </button>
                            );
                        })}
                    </div>

                    {expandedFactor && factorMap.has(expandedFactor) && (
                        <div className="pl-1">
                            <p className="text-xs text-gray-400 mb-1">
                                {FACTOR_LABELS[expandedFactor] ?? expandedFactor} — ic_20d 近 12 個月走勢
                            </p>
                            <FactorICSparkline
                                data={[...factorMap.get(expandedFactor)!]
                                    .sort((a, b) => a.month.localeCompare(b.month))
                                    .map((r) => ({ month: r.month, ic_20d: r.ic_20d }))}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
