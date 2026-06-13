import Link from 'next/link';
import type { WindowMomentumStock } from '@/app/actions/getWindowMomentum';
import { getEtfMeta } from '@/lib/investment/etfRegistry';
import { MiniKChart } from './MiniKChart';

interface Props {
    stock: WindowMomentumStock;
    windowStart: string;
    windowEnd: string;
}

const TREND_LABEL = {
    accelerating: { text: '加速', cls: 'text-rose-600 dark:text-rose-400' },
    steady: { text: '持平', cls: 'text-slate-500 dark:text-slate-400' },
    decaying: { text: '衰退', cls: 'text-emerald-600 dark:text-emerald-400' },
} as const;

function absorptionLabel(ratio: number | null): { text: string; cls: string } {
    if (ratio === null) return { text: '—', cls: 'text-slate-400' };
    const pct = ratio * 100;
    if (pct >= 3) return { text: `${pct.toFixed(2)}% (顯著)`, cls: 'text-rose-600 dark:text-rose-400 font-semibold' };
    if (pct >= 1) return { text: `${pct.toFixed(2)}% (中等)`, cls: 'text-amber-600 dark:text-amber-400' };
    return { text: `${pct.toFixed(2)}% (輕微)`, cls: 'text-slate-500 dark:text-slate-400' };
}

export function MomentumCard({ stock, windowStart, windowEnd }: Props) {
    const trend = TREND_LABEL[stock.absorptionTrend];
    const absorption = absorptionLabel(stock.absorptionRatio);
    const lots = Math.round(stock.totalAccumulatedShares / 1000);
    const maxDetailWeight = Math.max(...stock.etfDetails.map((d) => d.netWeightChange), 0.0001);
    const priceUp = (stock.priceChangePercent ?? 0) >= 0;

    return (
        <div className="glass-card p-5 flex flex-col gap-3">
            {/* 標題列 */}
            <div className="flex items-start justify-between">
                <Link href={`/investment/stock/${stock.stockCode}`} className="group">
                    <div className="flex items-baseline gap-2">
                        <span className="text-xl font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {stock.stockCode}
                        </span>
                        {stock.priceChangePercent !== null && (
                            <span className={`text-sm font-semibold ${priceUp ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                {priceUp ? '+' : ''}{stock.priceChangePercent.toFixed(2)}%
                            </span>
                        )}
                    </div>
                    <span className="text-sm text-slate-500 dark:text-slate-400">{stock.stockName}</span>
                </Link>
                <span className="flex flex-col items-center justify-center w-12 h-12 rounded-full border-2 border-amber-400 text-amber-500 shrink-0">
                    <span className="text-lg font-bold leading-none">{stock.etfCount}</span>
                    <span className="text-[10px] leading-none mt-0.5">家</span>
                </span>
            </div>

            {/* mini K + 量 */}
            <MiniKChart candles={stock.candles} />

            {/* 指標列 */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">窗口加碼</span>
                    <span className="font-mono text-slate-700 dark:text-slate-200">{lots.toLocaleString()} 張</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">吸量比</span>
                    <span className={`font-mono ${absorption.cls}`}>{absorption.text}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">合計增幅</span>
                    <span className="font-mono text-slate-700 dark:text-slate-200">+{stock.totalWeightChange.toFixed(2)}pp</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">吸量趨勢</span>
                    <span className={`font-semibold ${trend.cls}`}>{trend.text}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">最大單筆</span>
                    <span className="font-mono text-slate-700 dark:text-slate-200">+{stock.maxSingleWeightChange.toFixed(2)}pp</span>
                </div>
            </div>

            {/* 各 ETF 加碼 bar */}
            <div className="flex flex-col gap-1.5">
                {stock.etfDetails.map((d) => {
                    const meta = getEtfMeta(d.etfCode);
                    const color = meta?.color ?? '#64748b';
                    const widthPct = Math.max((d.netWeightChange / maxDetailWeight) * 100, 4);
                    return (
                        <div key={d.etfCode} className="flex items-center gap-2 text-xs">
                            <span className="w-32 truncate text-slate-600 dark:text-slate-300" title={meta?.name ?? d.etfCode}>
                                {d.etfCode} {meta?.name ?? ''}
                            </span>
                            <div className="flex-1 h-2 rounded-full bg-slate-200/60 dark:bg-slate-700/60 overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${widthPct}%`, backgroundColor: color }} />
                            </div>
                            <span className="w-14 text-right font-mono text-rose-600 dark:text-rose-400">
                                +{d.netWeightChange.toFixed(2)}%
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* 窗口起迄日 */}
            <div className="text-right text-[11px] text-slate-400 dark:text-slate-500">
                {windowStart} → {windowEnd}
            </div>
        </div>
    );
}
