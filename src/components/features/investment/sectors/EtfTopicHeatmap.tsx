'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { TopicWeightRow } from '@/lib/investment/topicUtils';

interface Props {
    topics: TopicWeightRow[];
    /** 所有 ETF 持股（用於展開面板顯示持股清單）*/
    holdingsByTopic: Record<string, { stock_code: string; stock_name: string; weight: number }[]>;
}

// 資料來源 stock_topics.color 存的是 Tailwind 色票名稱（'sky'、'amber'、'slate'、'violet'…），
// 不是合法 CSS 顏色。若直接當 backgroundColor 用：'orange'/'cyan' 等剛好是 CSS 命名色會顯示，
// 但 'sky'/'amber'/'slate'/'emerald' 不是 → 背景變透明、文字對比判斷錯誤
// （淺色模式下透明底配白字 → 文字看不到）。統一解析成 Tailwind-500 hex，背景與文字都以此為準。
const TAILWIND_500: Record<string, string> = {
    slate: '#64748b', gray: '#6b7280', zinc: '#71717a', neutral: '#737373', stone: '#78716c',
    red: '#ef4444', orange: '#f97316', amber: '#f59e0b', yellow: '#eab308', lime: '#84cc16',
    green: '#22c55e', emerald: '#10b981', teal: '#14b8a6', cyan: '#06b6d4', sky: '#0ea5e9',
    blue: '#3b82f6', indigo: '#6366f1', violet: '#8b5cf6', purple: '#a855f7', fuchsia: '#d946ef',
    pink: '#ec4899', rose: '#f43f5e',
};

const FALLBACK_HEX = '#6366f1'; // indigo-500（未知值 fallback，深色配白字）

/** 將資料來源的 color（Tailwind 色名或 #hex）解析成合法 hex 字串。 */
function resolveHex(color: string): string {
    const c = color.trim().toLowerCase();
    if (c.startsWith('#')) return c;
    return TAILWIND_500[c] ?? FALLBACK_HEX;
}

/** 以 hex 計算感知亮度，判斷該配深字（true）或白字（false）。 */
function isLight(hex: string): boolean {
    const h = hex.slice(1);
    const full = h.length === 3 ? h.split('').map((ch) => ch + ch).join('') : h.padEnd(6, '0');
    const num = parseInt(full, 16);
    if (Number.isNaN(num)) return false;
    const [r, g, b] = [(num >> 16) & 255, (num >> 8) & 255, num & 255];
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
                        const color = resolveHex(t.color || FALLBACK_HEX);
                        const lightText = isLight(color);
                        const sizeFraction = maxWeight > 0 ? t.total_weight / maxWeight : 0;
                        const isSelected = selectedTopicId === t.topic_id;
                        // 文字色一律走 inline，避開 dark-theme.css 對 .text-gray-* 的 !important 覆蓋，
                        // 確保對比永遠相對於卡片自身的主題色（深淺模式一致）。
                        const titleColor = lightText ? '#1f2937' : '#ffffff';              // gray-800 / white
                        const subColor = lightText ? '#4b5563' : 'rgba(255,255,255,0.85)';  // gray-600
                        const subColor2 = lightText ? '#6b7280' : 'rgba(255,255,255,0.65)'; // gray-500
                        const toggle = () => setSelectedTopicId(prev => prev === t.topic_id ? null : t.topic_id);

                        return (
                            <div
                                key={t.topic_id}
                                role="button"
                                tabIndex={0}
                                onClick={toggle}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        toggle();
                                    }
                                }}
                                className={`topic-tile p-2 text-left transition-all duration-150 relative overflow-hidden cursor-pointer ${
                                    isSelected ? 'ring-2 ring-offset-1 ring-white' : 'hover:opacity-90'
                                }`}
                                style={{ backgroundColor: color, minHeight: `${48 + sizeFraction * 32}px` }}
                                title={`${t.name} · 持股 ${t.holding_count} 支 · ETF合計 ${t.total_weight.toFixed(2)}%`}
                            >
                                <p className="text-[10px] font-semibold leading-tight line-clamp-2 mb-1" style={{ color: titleColor }}>
                                    {t.short_name}
                                </p>
                                <p className="text-[10px] tabular-nums" style={{ color: subColor }}>
                                    {t.holding_count}支
                                </p>
                                <p className="text-[9px] tabular-nums" style={{ color: subColor2 }}>
                                    {t.total_weight.toFixed(1)}%
                                </p>
                            </div>
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
