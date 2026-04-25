'use client';

import { ETF_REGISTRY } from '@/lib/investment/etfRegistry';
import { StockQuantMetrics } from '@/hooks/investment/useStockDashboard';
import { PriceData } from '@/lib/investment/indicators';

interface Props {
    etfWeightHistory: Record<string, { date: string; weight: number; rank: number }[]>;
    quantMetrics: StockQuantMetrics;
    priceData: PriceData[];
}

function MetricChip({
    label, value, highlighted, valueColor,
}: { label: string; value: string; highlighted?: boolean; valueColor?: string }) {
    const base = highlighted
        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400';
    return (
        <div className={`flex flex-col items-center px-3 py-1.5 rounded-lg border ${base} min-w-[60px]`}>
            <span className="text-[10px] opacity-60 whitespace-nowrap">{label}</span>
            <span className={`text-sm font-bold leading-tight ${valueColor ?? ''}`}>{value}</span>
        </div>
    );
}

export function StockPoolMetrics({ etfWeightHistory, quantMetrics, priceData }: Props) {
    const currentWeights = Object.entries(etfWeightHistory)
        .filter(([, entries]) => entries.length > 0)
        .map(([etfCode, entries]) => {
            const last = entries[entries.length - 1];
            return { etfCode, weight: last.weight, rank: last.rank };
        })
        .sort((a, b) => b.weight - a.weight);

    if (currentWeights.length === 0 && quantMetrics.filter_score === null) return null;

    const latest = priceData[priceData.length - 1];
    const amount = latest?.amount ?? null;
    const marginRatio = latest?.margin_ratio ?? null;

    const pctColor = (v: number | null) =>
        v === null ? '' : v > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400';

    const filterScore = quantMetrics.filter_score ?? 0;
    const scoreColor =
        filterScore >= 3 ? 'text-rose-600 dark:text-rose-400' :
        filterScore >= 2 ? 'text-amber-600 dark:text-amber-400' :
        'text-slate-600 dark:text-slate-400';

    return (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 mb-4">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">選股池指標</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 font-semibold">
                    共持 {currentWeights.length} 支 ETF
                </span>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
                <MetricChip
                    label="動能分"
                    value={`${filterScore}/3`}
                    highlighted={filterScore >= 2}
                    valueColor={scoreColor}
                />
                <MetricChip
                    label="60日動能"
                    value={quantMetrics.momentum_60d !== null
                        ? `${quantMetrics.momentum_60d > 0 ? '+' : ''}${quantMetrics.momentum_60d.toFixed(1)}%`
                        : '—'}
                    highlighted={quantMetrics.momentum_pass}
                    valueColor={pctColor(quantMetrics.momentum_60d)}
                />
                <MetricChip
                    label="投信5日"
                    value={quantMetrics.it_buy_5d !== null
                        ? `${quantMetrics.it_buy_5d > 0 ? '+' : ''}${(quantMetrics.it_buy_5d / 1000).toFixed(0)}K`
                        : '—'}
                    highlighted={quantMetrics.it_buy_5d_pass}
                    valueColor={pctColor(quantMetrics.it_buy_5d)}
                />
                <MetricChip
                    label="YOY%"
                    value={quantMetrics.revenue_yoy !== null
                        ? `${quantMetrics.revenue_yoy > 0 ? '+' : ''}${quantMetrics.revenue_yoy.toFixed(1)}%`
                        : '—'}
                    highlighted={quantMetrics.rev_ma3_new_high}
                    valueColor={pctColor(quantMetrics.revenue_yoy)}
                />
                {amount !== null && amount > 0 && (
                    <MetricChip label="成交量" value={`${(amount / 1e8).toFixed(1)}億`} />
                )}
                {marginRatio !== null && marginRatio > 0 && (
                    <MetricChip label="資券%" value={`${marginRatio.toFixed(1)}%`} />
                )}
            </div>

            {currentWeights.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {currentWeights.map(({ etfCode, weight, rank }) => {
                        const meta = ETF_REGISTRY.find(e => e.code === etfCode);
                        return (
                            <div
                                key={etfCode}
                                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium"
                                style={{
                                    backgroundColor: meta ? `${meta.color}18` : '#f1f5f9',
                                    border: `1px solid ${meta ? `${meta.color}40` : '#e2e8f0'}`,
                                    color: meta?.color ?? '#64748b',
                                }}
                                title={meta?.name}
                            >
                                <span className="font-bold">{etfCode}</span>
                                <span className="opacity-60">#{rank}</span>
                                <span>{weight.toFixed(2)}%</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
