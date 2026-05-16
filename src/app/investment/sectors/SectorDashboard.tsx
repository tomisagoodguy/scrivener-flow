'use client';

import { useState, useTransition } from 'react';
import { getSectorStocks } from '@/app/actions/getSectorStrength';
import type { SectorRow, SectorStock } from '@/app/actions/getSectorStrength';

type SortKey = '1d' | '5d' | '20d';

function pctClass(val: number | null): string {
    if (val === null) return 'text-gray-400';
    return val >= 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400';
}

function fmtPct(val: number | null): string {
    if (val === null) return '—';
    return `${(val * 100).toFixed(2)}%`;
}

interface SectorRowProps {
    sector: SectorRow;
    date: string;
    rank: number;
    sortKey: SortKey;
}

function SectorItem({ sector, date, rank, sortKey }: SectorRowProps) {
    const [expanded, setExpanded] = useState(false);
    const [stocks, setStocks] = useState<SectorStock[]>([]);
    const [isPending, startTransition] = useTransition();

    const toggle = () => {
        if (!expanded && stocks.length === 0) {
            startTransition(async () => {
                const result = await getSectorStocks(sector.category, date);
                setStocks(result);
            });
        }
        setExpanded((v) => !v);
    };

    const primaryVal = sortKey === '1d' ? sector.ret_1d : sortKey === '5d' ? sector.ret_5d : sector.ret_20d;

    return (
        <div className="glass-card mb-2 overflow-hidden">
            <button
                onClick={toggle}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/30 transition-colors text-left"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <span className="text-gray-400 text-sm w-6 shrink-0">{rank}</span>
                    <span className="font-medium text-gray-800 dark:text-gray-100 truncate">{sector.category}</span>
                    <span className="text-xs text-gray-400 shrink-0">{sector.stock_count} 支</span>
                </div>
                <div className="flex items-center gap-4 shrink-0 ml-4">
                    <div className="hidden sm:flex gap-4 text-sm">
                        <span className={pctClass(sector.ret_1d)}>日 {fmtPct(sector.ret_1d)}</span>
                        <span className={pctClass(sector.ret_5d)}>週 {fmtPct(sector.ret_5d)}</span>
                        <span className={pctClass(sector.ret_20d)}>月 {fmtPct(sector.ret_20d)}</span>
                    </div>
                    <span className={`sm:hidden font-semibold ${pctClass(primaryVal)}`}>{fmtPct(primaryVal)}</span>
                    <span className="text-gray-400 text-sm">{expanded ? '▲' : '▼'}</span>
                </div>
            </button>

            {expanded && (
                <div className="border-t border-white/30 px-4 py-2">
                    {isPending && <p className="text-gray-400 text-sm py-2">載入中...</p>}
                    {!isPending && stocks.length === 0 && <p className="text-gray-400 text-sm py-2">無資料</p>}
                    {!isPending && stocks.length > 0 && (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-gray-400 text-xs border-b border-white/20">
                                    <th className="text-left py-1">股票</th>
                                    <th className="text-right py-1">日漲幅</th>
                                    <th className="text-right py-1 hidden sm:table-cell">週漲幅</th>
                                    <th className="text-right py-1 hidden sm:table-cell">月漲幅</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stocks.map((s) => (
                                    <tr key={s.stock_id} className="border-b border-white/10 last:border-0">
                                        <td className="py-1.5 font-medium">
                                            {s.stock_name ?? s.stock_id}
                                            <span className="text-gray-400 ml-1 text-xs">{s.stock_id}</span>
                                        </td>
                                        <td className={`text-right py-1.5 ${pctClass(s.ret_1d)}`}>{fmtPct(s.ret_1d)}</td>
                                        <td className={`text-right py-1.5 hidden sm:table-cell ${pctClass(s.ret_5d)}`}>{fmtPct(s.ret_5d)}</td>
                                        <td className={`text-right py-1.5 hidden sm:table-cell ${pctClass(s.ret_20d)}`}>{fmtPct(s.ret_20d)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
}

interface Props {
    data: { date: string; sectors: SectorRow[] };
}

export default function SectorDashboard({ data }: Props) {
    const [sortKey, setSortKey] = useState<SortKey>('1d');

    const sorted = [...data.sectors].sort((a, b) => {
        const va = sortKey === '1d' ? a.ret_1d : sortKey === '5d' ? a.ret_5d : a.ret_20d;
        const vb = sortKey === '1d' ? b.ret_1d : sortKey === '5d' ? b.ret_5d : b.ret_20d;
        return (vb ?? -Infinity) - (va ?? -Infinity);
    });

    const tabs: { key: SortKey; label: string }[] = [
        { key: '1d', label: '今日' },
        { key: '5d', label: '本週' },
        { key: '20d', label: '本月' },
    ];

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2">
                    {tabs.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setSortKey(t.key)}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                                sortKey === t.key
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white/50 text-gray-600 hover:bg-white/70'
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
                {data.date && (
                    <span className="text-xs text-gray-400">資料日期：{data.date}</span>
                )}
            </div>

            {sorted.length === 0 ? (
                <p className="text-gray-400 text-center py-12">尚無族群資料，請等待 Pipeline 執行後重整。</p>
            ) : (
                sorted.map((sector, i) => (
                    <SectorItem
                        key={sector.category}
                        sector={sector}
                        date={data.date}
                        rank={i + 1}
                        sortKey={sortKey}
                    />
                ))
            )}
        </div>
    );
}
