'use client';

import Link from 'next/link';
import type { SectorRow, SectorStock } from '@/app/actions/getSectorStrength';
import type { EtfSectorActivityMap } from '@/app/actions/getEtfSectorActivity';
import { pctClass, fmtPct } from '@/lib/investment/formatUtils';

function etfDotClass(count: number): string {
    if (count >= 3) return 'bg-rose-600 shadow-[0_0_4px_rgba(225,29,72,0.6)]';
    if (count === 2) return 'bg-rose-400';
    return 'bg-rose-300';
}

function etfBorderClass(count: number): string {
    if (count >= 3) return 'border-rose-400/70 dark:border-rose-500/50';
    if (count === 2) return 'border-rose-300/60 dark:border-rose-400/40';
    if (count === 1) return 'border-rose-200/60 dark:border-rose-300/30';
    return 'border-white/50 dark:border-white/20';
}

function StockChip({ stock, etfCodes }: { stock: SectorStock; etfCodes?: string[] }) {
    const hasEtf = etfCodes && etfCodes.length > 0;
    const tooltipText = hasEtf ? `ETF買進：${etfCodes.join(' / ')}` : undefined;

    return (
        <Link
            href={`/investment/dashboard/${stock.stock_id}`}
            title={tooltipText}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-white/60 hover:bg-white/90 dark:bg-white/10 dark:hover:bg-white/20 transition-colors border ${hasEtf ? etfBorderClass(etfCodes.length) : 'border-white/50 dark:border-white/20'}`}
        >
            {hasEtf && (
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${etfDotClass(etfCodes.length)}`} />
            )}
            <span className="font-medium text-gray-700 dark:text-gray-200">
                {stock.stock_name ?? stock.stock_id}
            </span>
            <span className="text-gray-400 text-[10px]">{stock.stock_id}</span>
            {stock.ret_1d !== null && (
                <span className={`font-semibold ${pctClass(stock.ret_1d)}`}>{fmtPct(stock.ret_1d)}</span>
            )}
            {stock.is_strategy_hit && <span className="text-yellow-400">⚡</span>}
        </Link>
    );
}

function cardBg(pct: number): string {
    if (pct >= 3)   return 'rgba(153,27,27,0.18)';
    if (pct >= 1.5) return 'rgba(220,38,38,0.13)';
    if (pct >= 0.5) return 'rgba(248,113,113,0.10)';
    if (pct >= 0)   return 'rgba(254,202,202,0.12)';
    if (pct >= -0.5) return 'rgba(187,247,208,0.12)';
    if (pct >= -1.5) return 'rgba(74,222,128,0.13)';
    return 'rgba(22,163,74,0.18)';
}

function SectorCard({ sector, stocks, hasLoaded, rank, stockEtfMap }: { sector: SectorRow; stocks: SectorStock[]; hasLoaded: boolean; rank: number; stockEtfMap?: Record<string, string[]> }) {
    const ret = sector.ret_1d ?? 0;
    const accentClass = ret > 0 ? 'border-l-rose-400' : ret < 0 ? 'border-l-emerald-400' : 'border-l-gray-300 dark:border-l-gray-600';

    return (
        <div className={`glass-card overflow-hidden border-l-4 ${accentClass}`} style={{ backgroundColor: cardBg(ret) }}>
            <div className="px-3 pt-2.5 pb-2 border-b border-white/20">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <span className="shrink-0 text-[10px] font-bold text-gray-400 w-5 text-right leading-tight">{rank}</span>
                        <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm leading-tight truncate">
                            {sector.category}
                        </span>
                    </div>
                    <div className="flex gap-2 text-xs shrink-0 pt-0.5">
                        <span className={`font-medium ${pctClass(sector.ret_1d)}`}>{fmtPct(sector.ret_1d)}</span>
                        <span className="hidden sm:inline text-gray-400">{fmtPct(sector.ret_5d)}</span>
                        <span className="hidden md:inline text-gray-400">{fmtPct(sector.ret_20d)}</span>
                    </div>
                </div>
                <span className="text-[11px] text-gray-400">{sector.stock_count} 支</span>
            </div>
            <div className="px-3 py-2.5 min-h-[52px]">
                {!hasLoaded ? (
                    <div className="flex gap-1.5 flex-wrap">
                        {Array.from({ length: Math.min(sector.stock_count, 5) }).map((_, i) => (
                            <div key={i} className="h-6 w-20 bg-gray-200/50 dark:bg-gray-700/40 rounded-full animate-pulse" />
                        ))}
                    </div>
                ) : stocks.length === 0 ? (
                    <span className="text-gray-400 text-xs">無成分股資料</span>
                ) : (
                    <div className="flex flex-wrap gap-1.5">
                        {stocks.map((s) => (
                            <StockChip
                                key={s.stock_id}
                                stock={s}
                                etfCodes={stockEtfMap?.[s.stock_id]}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

interface Props {
    sectors: SectorRow[];
    stocksByCategory: Record<string, SectorStock[]>;
    hasLoaded: boolean;
    sortKey?: string;
    etfActivity?: EtfSectorActivityMap;
}

export default function GroupedSectorView({ sectors, stocksByCategory, hasLoaded, sortKey, etfActivity }: Props) {
    if (!hasLoaded) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="glass-card overflow-hidden border-l-4 border-l-gray-200 dark:border-l-gray-700 h-28 animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {sectors.map((sector, i) => (
                <SectorCard
                    key={sector.category}
                    sector={sector}
                    stocks={stocksByCategory[sector.category] ?? []}
                    hasLoaded={hasLoaded}
                    rank={i + 1}
                    stockEtfMap={etfActivity?.[sector.category]?.stock_etf_map}
                />
            ))}
        </div>
    );
}
