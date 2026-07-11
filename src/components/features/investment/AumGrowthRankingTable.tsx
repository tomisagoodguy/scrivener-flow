'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { TrendingUp, ArrowUpDown } from 'lucide-react';
import type { AumGrowthRankingRow } from '@/app/actions/getEtfMechanics';

type SortKey = 'inflowShareOfGrowth' | 'growthMult' | 'aumCurrent' | 'cumInflow';

const COLUMNS: { key: SortKey; label: string }[] = [
    { key: 'inflowShareOfGrowth', label: '申購占成長比' },
    { key: 'growthMult', label: '成長倍數' },
    { key: 'aumCurrent', label: '當前規模(億)' },
    { key: 'cumInflow', label: '累計申購(億)' },
];

function shareColor(share: number | null): string {
    if (share === null) return 'text-slate-400';
    if (share > 0.7) return 'text-rose-600 dark:text-rose-400 font-semibold';
    if (share < 0.3) return 'text-emerald-600 dark:text-emerald-400 font-semibold';
    return 'text-slate-700 dark:text-slate-300';
}

interface AumGrowthRankingTableProps {
    rows: AumGrowthRankingRow[];
}

/** 跨 ETF 申購占成長比排行（可排序，各列連到深潛頁市場機制 Tab）。 */
export function AumGrowthRankingTable({ rows }: AumGrowthRankingTableProps) {
    const [sortKey, setSortKey] = useState<SortKey>('inflowShareOfGrowth');
    const [desc, setDesc] = useState(true);

    const sorted = useMemo(() => {
        return [...rows].sort((a, b) => {
            const av = a[sortKey];
            const bv = b[sortKey];
            if (av === null && bv === null) return 0;
            if (av === null) return 1; // null 沉底
            if (bv === null) return -1;
            return desc ? bv - av : av - bv;
        });
    }, [rows, sortKey, desc]);

    function handleSort(key: SortKey) {
        if (key === sortKey) {
            setDesc((d) => !d);
        } else {
            setSortKey(key);
            setDesc(true);
        }
    }

    return (
        <div className="glass-card rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 pt-4 pb-2">
                <TrendingUp className="w-5 h-5 text-violet-500" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">申購占成長比排行</h3>
                <span className="text-xs text-slate-400" title="近似公式：units 由 AUM/NAV 推算；申購占成長比 = 累計申購 / 總 AUM 成長">
                    成長是申購送進來的還是漲出來的（近似值 ⓘ）
                </span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500 dark:text-slate-400">
                            <th className="px-4 py-3 text-left">#</th>
                            <th className="px-4 py-3 text-left">ETF</th>
                            {COLUMNS.map((c) => (
                                <th
                                    key={c.key}
                                    className="px-4 py-3 text-right cursor-pointer select-none hover:text-indigo-500 transition-colors"
                                    onClick={() => handleSort(c.key)}
                                >
                                    <span className="inline-flex items-center gap-1">
                                        {c.label}
                                        <ArrowUpDown className={`w-3 h-3 ${sortKey === c.key ? 'text-indigo-500' : 'opacity-40'}`} />
                                        {sortKey === c.key && <span className="text-indigo-500">{desc ? '↓' : '↑'}</span>}
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((r, i) => (
                            <tr key={r.etfCode} className="border-t border-slate-100 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="px-4 py-3 text-slate-400 text-xs">{i + 1}</td>
                                <td className="px-4 py-3">
                                    <Link href={`/investment/${r.etfCode}?tab=mechanics`} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                        <span className="font-mono text-xs">{r.etfCode}</span>
                                        <span className="ml-2 text-slate-600 dark:text-slate-300">{r.etfName}</span>
                                    </Link>
                                </td>
                                <td className={`px-4 py-3 text-right ${shareColor(r.inflowShareOfGrowth)}`}>
                                    {r.inflowShareOfGrowth !== null ? `${(r.inflowShareOfGrowth * 100).toFixed(1)}%` : '—'}
                                </td>
                                <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                                    {r.growthMult !== null ? `${r.growthMult.toFixed(2)}x` : '—'}
                                </td>
                                <td className="px-4 py-3 text-right font-medium text-slate-800 dark:text-slate-200">
                                    {r.aumCurrent !== null ? r.aumCurrent.toFixed(1) : '—'}
                                </td>
                                <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{r.cumInflow.toFixed(1)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-700/50 text-xs text-slate-400 flex flex-wrap gap-3">
                <span>點欄位標題切換排序，點 ETF 進入深潛頁市場機制</span>
                <span className="text-rose-600">&gt;70% 規模驅動（申購撐起來的）</span>
                <span className="text-emerald-600">&lt;30% 淨值驅動（漲出來的）</span>
            </div>
        </div>
    );
}
