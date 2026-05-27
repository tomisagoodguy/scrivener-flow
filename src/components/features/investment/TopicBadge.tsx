'use client';

import { getStockTopics } from '@/lib/investment/topicUtils';

interface Props {
    stockCode: string;
}

/**
 * 顯示股票所屬題材的 badge chips。
 * - 最多顯示 2 個 shortname badge
 * - 超出以 +N overflow chip 顯示
 * - 無題材時 return null
 */
export function TopicBadge({ stockCode }: Props) {
    const topics = getStockTopics(stockCode);
    if (topics.length === 0) return null;

    const visible = topics.slice(0, 2);
    const overflow = topics.length - 2;

    return (
        <>
            {visible.map((t) => (
                <span
                    key={t.id}
                    className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700/50 leading-none whitespace-nowrap"
                    title={t.name}
                >
                    {t.shortname}
                </span>
            ))}
            {overflow > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 leading-none whitespace-nowrap">
                    +{overflow}
                </span>
            )}
        </>
    );
}
