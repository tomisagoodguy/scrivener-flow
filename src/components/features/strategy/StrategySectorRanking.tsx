'use client';

import type { StrategySectorRow } from '@/app/actions/getStrategyAnalytics';
import type { SectorStock } from '@/app/actions/getSectorStrength';
import { fmtPct } from '@/lib/investment/formatUtils';

type Period = '1d' | '5d' | '20d';

interface Props {
    sectorRanking: StrategySectorRow[];
    period: Period;
    stocks?: SectorStock[];
}

function retForPeriod(row: StrategySectorRow, period: Period): number | null {
    if (period === '1d') return row.weightedRet1d;
    if (period === '5d') return row.weightedRet5d;
    return row.weightedRet20d;
}

export default function StrategySectorRanking({ sectorRanking, period, stocks = [] }: Props) {
    const sorted = [...sectorRanking]
        .sort((a, b) => (retForPeriod(b, period) ?? -999) - (retForPeriod(a, period) ?? -999))
        .slice(0, 12);

    if (sorted.length === 0) {
        return (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
                暫無族群資料
            </div>
        );
    }

    const maxAbs = Math.max(
        ...sorted.map((r) => Math.abs(retForPeriod(r, period) ?? 0)),
        0.001,
    );

    const stocksByCategory = stocks.reduce<Record<string, SectorStock[]>>((acc, s) => {
        if (!s.category) return acc;
        if (!acc[s.category]) acc[s.category] = [];
        acc[s.category].push(s);
        return acc;
    }, {});

    return (
        <div className="space-y-1.5">
            {sorted.map((row) => {
                const ret = retForPeriod(row, period);
                const isPos = ret !== null && ret >= 0;
                const barPct = ret !== null ? Math.abs(ret) / maxAbs * 100 : 0;
                const label = row.category.split(':').pop() ?? row.category;
                const sectorStocks = (stocksByCategory[row.category] ?? [])
                    .sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0));

                return (
                    <div key={row.category} className="rounded px-1 py-1 hover:bg-white/20">
                        {/* 族群列 */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600 dark:text-gray-400 w-20 shrink-0 truncate" title={label}>
                                {label}
                            </span>
                            <div className="flex-1 flex items-center gap-1 min-w-0">
                                <div className="flex-1 h-4 bg-gray-100/50 dark:bg-white/10 rounded-sm overflow-hidden">
                                    <div
                                        className="h-full rounded-sm transition-all duration-300"
                                        style={{
                                            width: `${barPct}%`,
                                            backgroundColor: isPos ? '#dc2626' : '#16a34a',
                                        }}
                                    />
                                </div>
                                <span
                                    className="text-xs font-bold w-14 text-right shrink-0"
                                    style={{ color: ret === null ? '#94a3b8' : isPos ? '#dc2626' : '#16a34a' }}
                                >
                                    {fmtPct(ret)}
                                </span>
                            </div>
                            <span className="text-xs text-gray-400 w-8 text-right shrink-0">{row.stockCount}</span>
                        </div>

                        {/* 成分股 chips — 自動換行 */}
                        {sectorStocks.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1 pl-1">
                                {sectorStocks.map((s) => {
                                    const sRet = period === '1d' ? s.ret_1d : period === '5d' ? s.ret_5d : s.ret_20d;
                                    const sPos = sRet !== null && sRet >= 0;
                                    return (
                                        <span
                                            key={s.stock_id}
                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] bg-gray-100/60 dark:bg-white/10"
                                        >
                                            <span className="text-gray-500 dark:text-gray-400 font-mono">{s.stock_id}</span>
                                            <span className="text-gray-600 dark:text-gray-300">{s.stock_name ?? ''}</span>
                                            <span
                                                className="font-bold"
                                                style={{ color: sRet === null ? '#94a3b8' : sPos ? '#dc2626' : '#16a34a' }}
                                            >
                                                {fmtPct(sRet)}
                                            </span>
                                        </span>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
            <div className="flex items-center gap-2 px-1 pt-0.5">
                <span className="text-[10px] text-gray-400 w-20 shrink-0" />
                <div className="flex-1" />
                <span className="text-[10px] text-gray-400 w-14 text-right shrink-0">漲跌幅</span>
                <span className="text-[10px] text-gray-400 w-8 text-right shrink-0">檔</span>
            </div>
        </div>
    );
}
