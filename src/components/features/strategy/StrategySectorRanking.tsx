'use client';

import { useState } from 'react';
import type { StrategySectorRow } from '@/app/actions/getStrategyAnalytics';
import type { SectorStock } from '@/app/actions/getSectorStrength';
import { fmtPct } from '@/lib/investment/formatUtils';

type SortPeriod = '1d' | '5d' | '20d';

interface Props {
    sectorRanking: StrategySectorRow[];
    stocks?: SectorStock[];
}

function retColor(ret: number | null): string {
    if (ret === null) return '#94a3b8';
    return ret >= 0 ? '#dc2626' : '#16a34a';
}

function retForSort(row: StrategySectorRow, period: SortPeriod): number {
    if (period === '1d') return row.weightedRet1d ?? -999;
    if (period === '5d') return row.weightedRet5d ?? -999;
    return row.weightedRet20d ?? -999;
}

export default function StrategySectorRanking({ sectorRanking, stocks = [] }: Props) {
    const [sortBy, setSortBy] = useState<SortPeriod>('1d');

    const sorted = [...sectorRanking]
        .sort((a, b) => retForSort(b, sortBy) - retForSort(a, sortBy))
        .slice(0, 12);

    if (sorted.length === 0) {
        return (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
                暫無族群資料
            </div>
        );
    }

    const maxAbs = Math.max(
        ...sorted.map((r) => Math.abs(retForSort(r, sortBy))),
        0.001,
    );

    const stocksByCategory = stocks.reduce<Record<string, SectorStock[]>>((acc, s) => {
        if (!s.category) return acc;
        if (!acc[s.category]) acc[s.category] = [];
        acc[s.category].push(s);
        return acc;
    }, {});

    const cols: { key: SortPeriod; label: string }[] = [
        { key: '1d', label: '日' },
        { key: '5d', label: '週' },
        { key: '20d', label: '月' },
    ];

    return (
        <div className="space-y-1.5">
            {/* Clickable column headers */}
            <div className="flex items-center gap-2 px-1 mb-1">
                <span className="text-[10px] text-gray-400 w-20 shrink-0" />
                <div className="flex-1" />
                {cols.map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => setSortBy(key)}
                        className={`w-12 text-right shrink-0 text-[10px] font-medium transition-colors ${
                            sortBy === key
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                        }`}
                    >
                        {label}{sortBy === key ? ' ▼' : ''}
                    </button>
                ))}
                <span className="text-[10px] text-gray-400 w-6 text-right shrink-0">檔</span>
            </div>

            {sorted.map((row) => {
                const primaryRet = sortBy === '1d' ? row.weightedRet1d : sortBy === '5d' ? row.weightedRet5d : row.weightedRet20d;
                const isPos = primaryRet !== null && primaryRet >= 0;
                const barPct = primaryRet !== null ? Math.abs(primaryRet) / maxAbs * 100 : 0;
                const label = row.category.split(':').pop() ?? row.category;
                const sectorStocks = (stocksByCategory[row.category] ?? [])
                    .sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0));

                return (
                    <div key={row.category} className="rounded px-1 py-1 hover:bg-white/20">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600 dark:text-gray-400 w-20 shrink-0 truncate" title={label}>
                                {label}
                            </span>
                            {/* Bar tracks the active sort period */}
                            <div className="flex-1 h-4 bg-gray-100/50 dark:bg-white/10 rounded-sm overflow-hidden">
                                <div
                                    className="h-full rounded-sm transition-all duration-300"
                                    style={{
                                        width: `${barPct}%`,
                                        backgroundColor: isPos ? '#dc2626' : '#16a34a',
                                    }}
                                />
                            </div>
                            {cols.map(({ key }) => {
                                const ret = key === '1d' ? row.weightedRet1d : key === '5d' ? row.weightedRet5d : row.weightedRet20d;
                                return (
                                    <span
                                        key={key}
                                        className={`w-12 text-right shrink-0 text-xs transition-all ${sortBy === key ? 'font-bold' : 'font-medium opacity-75'}`}
                                        style={{ color: retColor(ret) }}
                                    >
                                        {fmtPct(ret)}
                                    </span>
                                );
                            })}
                            <span className="text-xs text-gray-400 w-6 text-right shrink-0">{row.stockCount}</span>
                        </div>

                        {/* 成分股 chips */}
                        {sectorStocks.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1 pl-1">
                                {sectorStocks.map((s) => (
                                    <span
                                        key={s.stock_id}
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] bg-gray-100/60 dark:bg-white/10"
                                    >
                                        <span className="text-gray-500 dark:text-gray-400 font-mono">{s.stock_id}</span>
                                        <span className="text-gray-600 dark:text-gray-300">{s.stock_name ?? ''}</span>
                                        <span className="font-bold" style={{ color: retColor(s.ret_1d) }}>
                                            {fmtPct(s.ret_1d)}
                                        </span>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
