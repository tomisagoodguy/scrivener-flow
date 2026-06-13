'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { TopicWeightRow } from '@/lib/investment/topicUtils';

interface Props {
    topics: TopicWeightRow[];
    /** 所有 ETF 持股（用於展開面板顯示持股清單）*/
    holdingsByTopic: Record<string, { stock_code: string; stock_name: string; weight: number }[]>;
}

// 資料來源的 color 可能是 hex（#rrggbb / #rgb）或 CSS 命名色（violet、cyan、orange…）。
// 只解析 hex 會把命名色誤判成黑色，導致淺色底（violet/cyan/orange）配白字而看不到文字。
const NAMED_COLORS: Record<string, [number, number, number]> = {
    red: [255, 0, 0], orange: [255, 165, 0], yellow: [255, 255, 0], gold: [255, 215, 0],
    green: [0, 128, 0], lime: [0, 255, 0], olive: [128, 128, 0],
    teal: [0, 128, 128], cyan: [0, 255, 255], aqua: [0, 255, 255], turquoise: [64, 224, 208],
    blue: [0, 0, 255], navy: [0, 0, 128], skyblue: [135, 206, 235], indigo: [75, 0, 130],
    purple: [128, 0, 128], violet: [238, 130, 238], magenta: [255, 0, 255], fuchsia: [255, 0, 255],
    pink: [255, 192, 203], crimson: [220, 20, 60], coral: [255, 127, 80], salmon: [250, 128, 114],
    brown: [165, 42, 42], maroon: [128, 0, 0], lavender: [230, 230, 250],
    gray: [128, 128, 128], grey: [128, 128, 128], silver: [192, 192, 192],
    black: [0, 0, 0], white: [255, 255, 255],
};

function resolveRgb(color: string): [number, number, number] {
    const c = color.trim().toLowerCase();
    if (c.startsWith('#')) {
        const hex = c.slice(1);
        const full = hex.length === 3 ? hex.split('').map((ch) => ch + ch).join('') : hex.padEnd(6, '0');
        const num = parseInt(full, 16);
        if (!Number.isNaN(num)) return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
    }
    if (NAMED_COLORS[c]) return NAMED_COLORS[c];
    return [99, 102, 241]; // 未知值 fallback：indigo（深色，配白字）
}

function isLight(color: string): boolean {
    const [r, g, b] = resolveRgb(color);
    return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

export function EtfTopicHeatmap({ topics, holdingsByTopic }: Props) {
    const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);

    const maxWeight = useMemo(() =>
        topics.reduce((m, t) => Math.max(m, t.total_weight), 0), [topics]);

    const selectedTopic = selectedTopicId
        ? topics.find(t => t.topic_id === selectedTopicId)
        : null;
    const selectedHoldings = selectedTopicId
        ? (holdingsByTopic[selectedTopicId] ?? []).sort((a, b) => b.weight - a.weight)
        : [];

    if (topics.length === 0) {
        return (
            <div className="glass-card flex items-center justify-center h-64 text-gray-400">
                主題資料尚未同步，請等待 Pipeline 執行後重整。
            </div>
        );
    }

    return (
        <div className="flex gap-4 items-start">
            {/* Left: heatmap blocks */}
            <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 mb-2">
                    依 ETF 持股加權計算 · 共 {topics.length} 個主題 · 點擊展開持股清單
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar">
                    {topics.map(t => {
                        const color = t.color || '#6366f1';
                        const lightText = isLight(color);
                        const sizeFraction = maxWeight > 0 ? t.total_weight / maxWeight : 0;
                        const isSelected = selectedTopicId === t.topic_id;

                        return (
                            <button
                                key={t.topic_id}
                                onClick={() => setSelectedTopicId(prev =>
                                    prev === t.topic_id ? null : t.topic_id
                                )}
                                className={`rounded-lg p-2 text-left transition-all duration-150 relative overflow-hidden ${
                                    isSelected ? 'ring-2 ring-offset-1 ring-white' : 'hover:opacity-90'
                                }`}
                                style={{ backgroundColor: color, minHeight: `${48 + sizeFraction * 32}px` }}
                                title={`${t.name} · 持股 ${t.holding_count} 支 · ETF合計 ${t.total_weight.toFixed(2)}%`}
                            >
                                <p className={`text-[10px] font-semibold leading-tight line-clamp-2 mb-1 ${lightText ? 'text-gray-800' : 'text-white'}`}>
                                    {t.short_name}
                                </p>
                                <p className={`text-[10px] tabular-nums ${lightText ? 'text-gray-600' : 'text-white/80'}`}>
                                    {t.holding_count}支
                                </p>
                                <p className={`text-[9px] tabular-nums ${lightText ? 'text-gray-500' : 'text-white/60'}`}>
                                    {t.total_weight.toFixed(1)}%
                                </p>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Right: holdings panel */}
            <div className="w-72 shrink-0">
                <div className="glass-card rounded-xl p-3 h-[480px]">
                    {selectedTopic ? (
                        <div className="flex flex-col h-full animate-fade-in">
                            <div className="mb-3">
                                <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm leading-snug">
                                    {selectedTopic.name}
                                </h3>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {selectedTopic.holding_count} 支 ETF 持股 ·
                                    ETF 合計權重 {selectedTopic.total_weight.toFixed(2)}%
                                </p>
                            </div>
                            <div className="overflow-y-auto flex-1 custom-scrollbar">
                                <table className="w-full text-xs">
                                    <thead className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
                                        <tr className="border-b border-gray-100 dark:border-slate-800">
                                            <th className="text-left py-1.5 pr-2 font-semibold text-gray-500">代號</th>
                                            <th className="text-left py-1.5 pr-2 font-semibold text-gray-500">名稱</th>
                                            <th className="text-right py-1.5 font-semibold text-gray-500">權重%</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedHoldings.map(h => (
                                            <tr
                                                key={h.stock_code}
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
                                                <td className="py-1.5 pr-2 text-gray-700 dark:text-gray-300 max-w-[5rem] truncate">
                                                    {h.stock_name}
                                                </td>
                                                <td className="py-1.5 text-right tabular-nums text-gray-600 dark:text-gray-400 font-medium">
                                                    {h.weight.toFixed(2)}%
                                                </td>
                                            </tr>
                                        ))}
                                        {selectedHoldings.length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="py-4 text-center text-gray-400">
                                                    無 ETF 持股資料
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center text-gray-400">
                            <p className="text-2xl mb-2">👆</p>
                            <p className="text-xs">點擊左側主題卡片</p>
                            <p className="text-xs">查看 ETF 持股清單</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
