'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { fmtPct, pctClass } from '@/lib/investment/formatUtils';
import type { TopicWithStats } from '@/lib/investment/topicUtils';
import { getTopicChain } from '@/lib/investment/chainMap';

interface Props {
    topics: TopicWithStats[];
}

/** 根據 avgRet1d（百分比）回傳熱力背景色 class（台股慣例：紅漲綠跌） */
function heatBgClass(val: number | null): string {
    if (val === null) return 'bg-slate-200 dark:bg-slate-700';
    if (val >= 2) return 'bg-rose-700';
    if (val >= 0.5) return 'bg-rose-400';
    if (val >= -0.5) return 'bg-slate-200';
    if (val >= -2) return 'bg-emerald-400';
    return 'bg-emerald-700';
}

/** 根據背景深淺決定文字顏色 */
function heatTextClass(val: number | null): string {
    if (val === null) return 'text-slate-500 dark:text-slate-400';
    if (val >= 2 || val <= -2) return 'text-white';
    if (val >= 0.5 || val <= -0.5) return 'text-white';
    return 'text-slate-700 dark:text-slate-200';
}

function fmtAvgRet(val: number | null): string {
    if (val === null) return '--';
    return `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`;
}

function ChainCompareTable({
    topicId,
    currentTopic,
    allTopics,
    onSelect,
}: {
    topicId: string;
    currentTopic: TopicWithStats;
    allTopics: TopicWithStats[];
    onSelect: (id: string) => void;
}) {
    const chain = useMemo(() => getTopicChain(topicId), [topicId]);

    const upstream = chain.upstream
        .map((id) => allTopics.find((t) => t.id === id))
        .filter((t): t is TopicWithStats => !!t);
    const downstream = chain.downstream
        .map((id) => allTopics.find((t) => t.id === id))
        .filter((t): t is TopicWithStats => !!t);

    if (upstream.length === 0 && downstream.length === 0) return null;

    interface Row { topic: TopicWithStats; role: '上游' | '本題材' | '下游'; isCurrent: boolean }
    const rows: Row[] = [
        ...upstream.map((t) => ({ topic: t, role: '上游' as const, isCurrent: false })),
        { topic: currentTopic, role: '本題材' as const, isCurrent: true },
        ...downstream.map((t) => ({ topic: t, role: '下游' as const, isCurrent: false })),
    ];

    return (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-800">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                供應鏈比對
            </p>
            <div className="space-y-0.5">
                {rows.map(({ topic, role, isCurrent }) => {
                    const bg = heatBgClass(topic.avgRet1d);
                    const txt = heatTextClass(topic.avgRet1d);
                    const roleColor =
                        role === '上游'
                            ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                            : role === '下游'
                            ? 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';

                    const row = (
                        <div
                            className={`flex items-center gap-2 px-2 py-1 rounded-lg ${isCurrent ? 'ring-1 ring-blue-400' : ''}`}
                        >
                            <span className={`shrink-0 text-[9px] font-bold px-1 py-0.5 rounded ${roleColor}`}>
                                {role}
                            </span>
                            <span className="flex-1 text-[11px] text-gray-700 dark:text-gray-200 truncate">
                                {topic.shortname}
                            </span>
                            <span className={`shrink-0 text-xs font-bold px-1.5 py-0.5 rounded ${bg} ${txt}`}>
                                {fmtAvgRet(topic.avgRet1d)}
                            </span>
                            <span className="shrink-0 text-[10px] text-gray-400 tabular-nums">
                                {topic.companyCount}支
                            </span>
                        </div>
                    );

                    return isCurrent ? (
                        <div key={topic.id}>{row}</div>
                    ) : (
                        <button
                            key={topic.id}
                            onClick={() => onSelect(topic.id)}
                            className="w-full text-left hover:bg-white/40 dark:hover:bg-white/10 rounded-lg transition-colors"
                        >
                            {row}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function TopicDetailPanel({
    topic,
    allTopics,
    onSelect,
}: {
    topic: TopicWithStats;
    allTopics: TopicWithStats[];
    onSelect: (id: string) => void;
}) {
    // 依 change_pct 降序排列（無資料者排最後）
    const sortedStocks = [...topic.stocks].sort((a, b) => {
        const pa = topic.stockReturns[a]?.change_pct ?? null;
        const pb = topic.stockReturns[b]?.change_pct ?? null;
        if (pa === null && pb === null) return 0;
        if (pa === null) return 1;
        if (pb === null) return -1;
        return pb - pa;
    });

    const withDataCount = topic.stocks.filter(
        (code) => topic.stockReturns[code] !== undefined,
    ).length;

    return (
        <div className="animate-fade-in">
            <div className="mb-3">
                <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm leading-snug">
                    {topic.name}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                    {topic.companyCount} 支成分股，{withDataCount} 支有資料
                </p>
            </div>

            <div>
                <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm z-10">
                        <tr className="border-b border-gray-100 dark:border-slate-800">
                            <th className="text-left py-1.5 pr-2 font-semibold text-gray-500 dark:text-slate-400">代號</th>
                            <th className="text-left py-1.5 pr-2 font-semibold text-gray-500 dark:text-slate-400">名稱</th>
                            <th className="text-right py-1.5 pr-2 font-semibold text-gray-500 dark:text-slate-400">收盤</th>
                            <th className="text-right py-1.5 font-semibold text-gray-500 dark:text-slate-400">漲跌</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedStocks.map((stockCode) => {
                            const data = topic.stockReturns[stockCode];
                            const name = data?.stock_name ?? stockCode;
                            const close = data?.close;
                            const changePct = data?.change_pct ?? null;
                            return (
                                <tr
                                    key={stockCode}
                                    className="border-b border-gray-50 dark:border-slate-800/50 hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors"
                                >
                                    <td className="py-1.5 pr-2 tabular-nums">
                                        <Link
                                            href={`/investment/stock/${stockCode}`}
                                            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                                        >
                                            {stockCode}
                                        </Link>
                                    </td>
                                    <td className="py-1.5 pr-2 text-gray-700 dark:text-gray-300 max-w-[5rem] truncate">
                                        {name}
                                    </td>
                                    <td className="py-1.5 pr-2 text-right tabular-nums text-gray-700 dark:text-gray-300">
                                        {close !== null && close !== undefined ? close.toFixed(2) : '--'}
                                    </td>
                                    <td className={`py-1.5 text-right tabular-nums font-medium ${pctClass(changePct)}`}>
                                        {fmtPct(changePct)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div>
                <ChainCompareTable topicId={topic.id} currentTopic={topic} allTopics={allTopics} onSelect={onSelect} />
            </div>
        </div>
    );
}

export function SectorTopicHeatmap({ topics }: Props) {
    const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);

    const selectedTopic = selectedTopicId
        ? (topics.find((t) => t.id === selectedTopicId) ?? null)
        : null;

    const handleSelect = (id: string) => setSelectedTopicId(id);

    return (
        <div className="mt-8">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-3">
                產業題材今日表現
                {selectedTopic && (
                    <span className="ml-2 text-sm font-normal text-gray-400">
                        — {selectedTopic.shortname}
                    </span>
                )}
            </h2>

            {/* 左右並排：熱力格 + 成分股詳情 */}
            <div className="flex gap-4 items-start">
                {/* 左側：熱力格（固定高度，自身可捲動） */}
                <div className="flex-1 min-w-0">
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5">
                        {topics.map((topic) => {
                            const bgClass = heatBgClass(topic.avgRet1d);
                            const textClass = heatTextClass(topic.avgRet1d);
                            const isSelected = selectedTopicId === topic.id;

                            return (
                                <button
                                    key={topic.id}
                                    onClick={() =>
                                        setSelectedTopicId((prev) =>
                                            prev === topic.id ? null : topic.id,
                                        )
                                    }
                                    className={`topic-heat-cell rounded-lg p-2 text-left transition-all duration-150 ${bgClass} ${
                                        isSelected
                                            ? 'ring-2 ring-blue-400 ring-offset-1 opacity-100'
                                            : 'hover:opacity-85'
                                    }`}
                                >
                                    <p className={`text-[11px] font-semibold leading-tight line-clamp-2 mb-1 ${textClass}`}>
                                        {topic.shortname}
                                    </p>
                                    <p className={`text-xs font-bold tabular-nums ${textClass}`}>
                                        {fmtAvgRet(topic.avgRet1d)}
                                    </p>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 右側：成分股詳情 Panel（固定寬度，固定高度） */}
                <div className="w-72 shrink-0">
                    <div className="glass-card rounded-xl p-3">
                        {selectedTopic ? (
                            <TopicDetailPanel topic={selectedTopic} allTopics={topics} onSelect={handleSelect} />
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center text-gray-400 py-12">
                                <p className="text-2xl mb-2">👆</p>
                                <p className="text-xs">點擊左側題材卡片</p>
                                <p className="text-xs">查看成分股明細</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
