'use client';

import Link from 'next/link';
import type { SectorStock } from '@/app/actions/getSectorStrength';
import { fmtPct, fmtAmount, pctClass } from '@/lib/investment/formatUtils';

type Period = '1d' | '5d' | '20d';

interface Props {
    stocks: SectorStock[];
    period: Period;
}

function sortedStocks(stocks: SectorStock[], period: Period): SectorStock[] {
    if (period === '1d') {
        return [...stocks].sort((a, b) => (b.amount ?? -1) - (a.amount ?? -1)).slice(0, 15);
    }
    const retKey = period === '5d' ? 'ret_5d' : 'ret_20d';
    return [...stocks]
        .sort((a, b) => (b[retKey] ?? -999) - (a[retKey] ?? -999))
        .slice(0, 15);
}

export default function StrategyVolumeRanking({ stocks, period }: Props) {
    const ranked = sortedStocks(stocks, period);
    const isAmountSort = period === '1d';

    if (ranked.length === 0) {
        return (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
                暫無資料
            </div>
        );
    }

    return (
        <div>
            {period !== '1d' && (
                <p className="text-[10px] text-gray-400 mb-2">按{period === '5d' ? '週' : '月'}漲跌幅排序</p>
            )}
            <table className="w-full text-xs">
                <thead>
                    <tr className="text-gray-400 border-b border-white/20">
                        <th className="text-left py-1 w-6">#</th>
                        <th className="text-left py-1">股票</th>
                        <th className="text-left py-1 hidden sm:table-cell">族群</th>
                        <th className="text-right py-1">{isAmountSort ? '成交金額' : '日漲跌'}</th>
                        <th className="text-right py-1">
                            {period === '1d' ? '日漲跌' : period === '5d' ? '週漲跌' : '月漲跌'}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {ranked.map((s, idx) => {
                        const displayRet = period === '1d' ? s.ret_1d : period === '5d' ? s.ret_5d : s.ret_20d;
                        return (
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
                                <td className="text-right py-1 text-gray-500">
                                    {isAmountSort ? fmtAmount(s.amount) : (
                                        <span className={pctClass(s.ret_1d)}>{fmtPct(s.ret_1d)}</span>
                                    )}
                                </td>
                                <td className={`text-right py-1 font-bold ${pctClass(displayRet)}`}>
                                    {fmtPct(displayRet)}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
