'use client';

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { getTopicHoldings, type TopicHolding } from '@/app/actions/getTopicHoldings';

interface Props {
    topicId: string | null;
    topicName?: string;
}

export function TopicHoldingsPanel({ topicId, topicName }: Props) {
    const [holdings, setHoldings] = useState<TopicHolding[]>([]);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (!topicId) {
            setHoldings([]);
            return;
        }
        startTransition(async () => {
            const result = await getTopicHoldings(topicId);
            setHoldings(result);
        });
    }, [topicId]);

    if (!topicId) {
        return (
            <div className="glass-card h-full flex flex-col items-center justify-center text-center text-gray-400 p-4">
                <p className="text-2xl mb-2">👆</p>
                <p className="text-sm">點擊左側節點</p>
                <p className="text-sm">查看 ETF 持股</p>
            </div>
        );
    }

    return (
        <div className="glass-card h-full flex flex-col p-4 overflow-hidden">
            <div className="mb-3">
                <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm leading-snug">
                    {topicName ?? topicId}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                    {isPending ? '載入中...' : `${holdings.length} 筆 ETF 持股`}
                </p>
            </div>

            {isPending ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
                </div>
            ) : holdings.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
                    此主題目前無 ETF 持股
                </div>
            ) : (
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
                            <tr className="border-b border-gray-100 dark:border-slate-800">
                                <th className="text-left py-1.5 pr-2 font-semibold text-gray-500">代號</th>
                                <th className="text-left py-1.5 pr-2 font-semibold text-gray-500">名稱</th>
                                <th className="text-center py-1.5 pr-2 font-semibold text-gray-500">ETF</th>
                                <th className="text-right py-1.5 font-semibold text-gray-500">權重%</th>
                            </tr>
                        </thead>
                        <tbody>
                            {holdings.map((h, i) => (
                                <tr
                                    key={`${h.stock_code}-${h.etf_code}-${i}`}
                                    className="border-b border-gray-50 dark:border-slate-800/50 hover:bg-gray-50/50 dark:hover:bg-slate-800/30"
                                >
                                    <td className="py-1.5 pr-2">
                                        <Link
                                            href={`/investment/stock/${h.stock_code}`}
                                            className="font-mono text-blue-600 dark:text-blue-400 hover:underline"
                                        >
                                            {h.stock_code}
                                        </Link>
                                    </td>
                                    <td className="py-1.5 pr-2 text-gray-700 dark:text-gray-300 max-w-[80px] truncate">
                                        {h.stock_name}
                                    </td>
                                    <td className="py-1.5 pr-2 text-center">
                                        <Link
                                            href={`/investment/${h.etf_code}`}
                                            className="text-indigo-600 dark:text-indigo-400 text-[10px] hover:underline font-mono"
                                        >
                                            {h.etf_code}
                                        </Link>
                                    </td>
                                    <td className="py-1.5 text-right tabular-nums font-medium text-gray-600 dark:text-gray-400">
                                        {h.weight.toFixed(2)}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
