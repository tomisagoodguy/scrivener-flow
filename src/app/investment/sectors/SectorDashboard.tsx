'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { getSectorStocks } from '@/app/actions/getSectorStrength';
import type { SectorRow, SectorStock } from '@/app/actions/getSectorStrength';
import { pctClass, fmtPct, fmtAmount } from '@/lib/investment/formatUtils';

type SortKey = '1d' | '5d' | '20d' | 'amount' | 'strength';

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

    const primaryKey = SORT_VAL_MAP[sortKey];
    const primaryVal = primaryKey ? (sector[primaryKey] as number | null) : null;

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
                <div className="flex items-center gap-3 shrink-0 ml-4">
                    <div className="hidden sm:flex gap-3 text-sm items-center">
                        <span className={pctClass(sector.ret_1d)}>日 {fmtPct(sector.ret_1d)}</span>
                        <span className={pctClass(sector.ret_5d)}>週 {fmtPct(sector.ret_5d)}</span>
                        <span className={pctClass(sector.ret_20d)}>月 {fmtPct(sector.ret_20d)}</span>
                        {sector.total_amount !== null && (
                            <span className="text-gray-500 dark:text-gray-400 text-xs border-l border-white/30 pl-3">
                                {fmtAmount(sector.total_amount)}
                            </span>
                        )}
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
                                            {s.is_strategy_hit && (
                                                <span className="ml-1.5 text-yellow-400 text-xs" title="均線多頭＋月營收成長">⚡</span>
                                            )}
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

const SORT_VAL_MAP: Record<SortKey, keyof SectorRow | null> = {
    '1d': 'ret_1d',
    '5d': 'ret_5d',
    '20d': 'ret_20d',
    'amount': null,
    'strength': 'strength_score',
};

function isStrengthSector(s: SectorRow): boolean {
    if ((s.ret_1d ?? 0) <= 0) return false;
    if ((s.ret_5d ?? 0) <= 0) return false;
    if ((s.breadth ?? 0) < 0.4) return false;
    if (s.total_amount !== null && s.avg_amount_5d !== null) {
        if (s.total_amount < s.avg_amount_5d * 0.8) return false;
    }
    return true;
}

export default function SectorDashboard({ data }: Props) {
    const [sortKey, setSortKey] = useState<SortKey>('1d');
    const [positiveOnly, setPositiveOnly] = useState(true);

    const isStrengthMode = sortKey === 'strength';

    const filtered = useMemo(() => {
        if (sortKey === 'strength') return data.sectors.filter(isStrengthSector);
        return positiveOnly ? data.sectors.filter((s) => (s.ret_1d ?? 0) > 0) : data.sectors;
    }, [data.sectors, positiveOnly, sortKey]);

    const sorted = useMemo(() => [...filtered].sort((a, b) => {
        if (sortKey === 'amount') {
            return (b.total_amount ?? 0) - (a.total_amount ?? 0);
        }
        if (sortKey === 'strength') {
            return (b.strength_score ?? -Infinity) - (a.strength_score ?? -Infinity);
        }
        const key = SORT_VAL_MAP[sortKey] as 'ret_1d' | 'ret_5d' | 'ret_20d';
        return ((b[key] as number | null) ?? -Infinity) - ((a[key] as number | null) ?? -Infinity);
    }), [filtered, sortKey]);

    const tabs: { key: SortKey; label: string }[] = [
        { key: '1d', label: '今日' },
        { key: '5d', label: '本週' },
        { key: '20d', label: '本月' },
        { key: 'amount', label: '成交金額' },
        { key: 'strength', label: '強勢' },
    ];

    const totalCount = data.sectors.length;
    const badgeCount = !isStrengthMode && !positiveOnly ? totalCount : filtered.length;

    return (
        <div>
            <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
                <Link href="/investment" className="hover:text-blue-600 transition-colors">選股池</Link>
                <span>›</span>
                <span className="text-gray-700 dark:text-gray-300">族群強弱</span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2 flex-wrap">
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
                <div className="flex items-center gap-3">
                    {isStrengthMode ? (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            強勢 {badgeCount}/{totalCount}
                        </span>
                    ) : (
                        <button
                            onClick={() => setPositiveOnly((v) => !v)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
                                positiveOnly
                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                                    : 'bg-white/50 text-gray-500 hover:bg-white/70'
                            }`}
                        >
                            <span>{positiveOnly ? '▲' : '≡'}</span>
                            <span>{positiveOnly ? `正報酬 ${badgeCount}/${totalCount}` : `全部 ${totalCount}`}</span>
                        </button>
                    )}
                    {data.date && (
                        <span className="text-xs text-gray-400">資料日期：{data.date}</span>
                    )}
                </div>
            </div>

            {sorted.length === 0 ? (
                <p className="text-gray-400 text-center py-12">
                    {isStrengthMode ? '今日無強勢族群' : (positiveOnly ? '今日無正報酬族群' : '尚無族群資料，請等待 Pipeline 執行後重整。')}
                </p>
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
