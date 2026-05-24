'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { SectorStock } from '@/app/actions/getSectorStrength';
import { fmtPct, fmtAmount, pctClass } from '@/lib/investment/formatUtils';

type SortKey = 'amount' | 'ret_1d' | 'ret_5d' | 'ret_20d';

const SORT_LABELS: Record<SortKey, string> = {
    amount: '成交金額',
    ret_1d: '日',
    ret_5d: '週',
    ret_20d: '月',
};

interface Props {
    stocks: SectorStock[];
}

export default function StrategyVolumeRanking({ stocks }: Props) {
    const [sortKey, setSortKey] = useState<SortKey>('amount');

    const ranked = [...stocks]
        .sort((a, b) => (b[sortKey] ?? -Infinity) - (a[sortKey] ?? -Infinity))
        .slice(0, 15);

    if (ranked.length === 0) {
        return (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
                暫無資料
            </div>
        );
    }

    const th = (key: SortKey) => (
        <th
            className={`text-right py-1 cursor-pointer select-none hover:text-gray-600 transition-colors ${
                sortKey === key ? 'text-blue-500 font-bold' : 'text-gray-400'
            }`}
            onClick={() => setSortKey(key)}
        >
            {SORT_LABELS[key]}{sortKey === key ? ' ▼' : ''}
        </th>
    );

    return (
        <table className="w-full text-xs">
            <thead>
                <tr className="border-b border-white/20">
                    <th className="text-left py-1 w-6 text-gray-400">#</th>
                    <th className="text-left py-1 text-gray-400">股票</th>
                    <th className="text-left py-1 hidden sm:table-cell text-gray-400">族群</th>
                    {th('amount')}
                    {th('ret_1d')}
                    {th('ret_5d')}
                    {th('ret_20d')}
                </tr>
            </thead>
            <tbody>
                {ranked.map((s, idx) => (
                    <tr key={`${s.stock_id}-${idx}`} className="border-b border-white/10 last:border-0 hover:bg-white/10">
                        <td className="py-1 text-gray-400">{idx + 1}</td>
                        <td className="py-1">
                            <Link
                                href={`/investment/stock/${s.stock_id}`}
                                className="hover:text-blue-600 transition-colors font-medium"
                            >
                                {s.stock_name ?? s.stock_id}
                                <span className="text-gray-400 ml-1">{s.stock_id}</span>
                            </Link>
                        </td>
                        <td className="py-1 hidden sm:table-cell text-gray-500 truncate max-w-[80px]">
                            {(s.category ?? '').split(':').pop() ?? '—'}
                        </td>
                        <td className={`text-right py-1 ${sortKey === 'amount' ? 'font-bold text-gray-700 dark:text-gray-200' : 'text-gray-500'}`}>
                            {fmtAmount(s.amount)}
                        </td>
                        <td className={`text-right py-1 ${sortKey === 'ret_1d' ? 'font-bold' : ''} ${pctClass(s.ret_1d)}`}>
                            {fmtPct(s.ret_1d)}
                        </td>
                        <td className={`text-right py-1 ${sortKey === 'ret_5d' ? 'font-bold' : ''} ${pctClass(s.ret_5d)}`}>
                            {fmtPct(s.ret_5d)}
                        </td>
                        <td className={`text-right py-1 ${sortKey === 'ret_20d' ? 'font-bold' : ''} ${pctClass(s.ret_20d)}`}>
                            {fmtPct(s.ret_20d)}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
