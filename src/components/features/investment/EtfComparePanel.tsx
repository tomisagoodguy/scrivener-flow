'use client';

import React, { useMemo, useState } from 'react';

// ── 型別定義 ────────────────────────────────────────────────────────────────

interface HoldingItem {
    stock_code: string;
    stock_name: string;
    weight: number;
    rank: number;
    in_etfs: string[];
}

interface SectorItem {
    sector_name: string;
    weight: number;
}

interface EtfData {
    etf_code: string;
    name: string;
    manager: string;
    color: string;
    data_date: string | null;
    holdings: HoldingItem[];
    aum_100m_twd: number | null;
    sectors: SectorItem[];
}

interface EtfComparePanelProps {
    etfs: EtfData[];
    overlap: {
        all3: string[];
        any2: string[];
    };
}

// ── 顏色常數 ────────────────────────────────────────────────────────────────

const SECTOR_COLORS = [
    '#6366f1', '#f59e0b', '#10b981', '#3b82f6', '#ec4899',
    '#8b5cf6', '#14b8a6', '#f97316', '#84cc16',
];

// ── Helper：截斷清單，超過 max 支時附加 +N 支 ────────────────────────────────

function truncateList(list: string[], max: number): { shown: string[]; remaining: number } {
    if (list.length <= max) return { shown: list, remaining: 0 };
    return { shown: list.slice(0, max), remaining: list.length - max };
}

// ── 子元件：重疊比例摘要卡 ───────────────────────────────────────────────────

function OverlapSummary({
    all3Count,
    any2Count,
    top10Count,
}: {
    all3Count: number;
    any2Count: number;
    top10Count: number;
}) {
    if (all3Count === 0 && any2Count === 0) {
        return (
            <div className="glass-card rounded-xl px-4 py-3 text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
                持股無重疊
            </div>
        );
    }

    const all3Pct = top10Count > 0 ? ((all3Count / top10Count) * 100).toFixed(0) : '0';
    const any2Pct = top10Count > 0 ? ((any2Count / top10Count) * 100).toFixed(0) : '0';

    return (
        <div className="glass-card rounded-xl px-4 py-3 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-yellow-400 shrink-0" />
                <span className="text-slate-700 dark:text-slate-200">
                    三方共同持有
                    <span className="font-bold mx-1 text-yellow-600 dark:text-yellow-400">{all3Count}</span>
                    支
                    <span className="text-slate-400 dark:text-slate-500 ml-1">（佔全部持股 {all3Pct}%）</span>
                </span>
            </div>
            {any2Count > 0 && (
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-blue-400 shrink-0" />
                    <span className="text-slate-700 dark:text-slate-200">
                        兩方共同持有
                        <span className="font-bold mx-1 text-blue-600 dark:text-blue-400">{any2Count}</span>
                        支
                        <span className="text-slate-400 dark:text-slate-500 ml-1">（佔全部持股 {any2Pct}%）</span>
                    </span>
                </div>
            )}
        </div>
    );
}

// ── 子元件：產業分布堆疊長條圖 ───────────────────────────────────────────────

function SectorBar({ sectors }: { sectors: SectorItem[] }) {
    if (!sectors.length) {
        return <div className="h-6 rounded bg-slate-100 dark:bg-slate-700 text-xs text-slate-400 flex items-center justify-center">無產業資料</div>;
    }
    const top8 = sectors.slice(0, 8);
    const otherWeight = Math.max(0, 100 - top8.reduce((s, x) => s + x.weight, 0));

    return (
        <div className="mt-3">
            <div className="flex h-5 rounded overflow-hidden w-full">
                {top8.map((s, i) => (
                    <div
                        key={s.sector_name}
                        title={`${s.sector_name}: ${s.weight.toFixed(1)}%`}
                        style={{
                            width: `${s.weight}%`,
                            backgroundColor: SECTOR_COLORS[i % SECTOR_COLORS.length],
                        }}
                    />
                ))}
                {otherWeight > 1 && (
                    <div
                        title={`其他: ${otherWeight.toFixed(1)}%`}
                        style={{ width: `${otherWeight}%`, backgroundColor: '#94a3b8' }}
                    />
                )}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                {top8.map((s, i) => (
                    <div key={s.sector_name} className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                        <span
                            className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                            style={{ backgroundColor: SECTOR_COLORS[i % SECTOR_COLORS.length] }}
                        />
                        {s.sector_name} {s.weight.toFixed(1)}%
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── 子元件：單支 ETF 卡片 ────────────────────────────────────────────────────

function EtfCard({
    etf,
    overlapAll3,
    overlapAny2,
}: {
    etf: EtfData;
    overlapAll3: Set<string>;
    overlapAny2: Set<string>;
}) {
    const [expanded, setExpanded] = useState(false);
    const topWeight = etf.holdings.slice(0, 10).reduce((s, h) => s + h.weight, 0);
    const displayedHoldings = expanded ? etf.holdings : etf.holdings.slice(0, 10);
    const hasMore = etf.holdings.length > 10;

    return (
        <div className="glass-card rounded-2xl overflow-hidden flex flex-col">
            {/* 卡片標頭 */}
            <div
                className="px-5 py-4 text-white"
                style={{ backgroundColor: etf.color }}
            >
                <div className="flex justify-between items-start">
                    <div>
                        <div className="text-lg font-bold">{etf.etf_code}</div>
                        <div className="text-sm opacity-90">{etf.name}</div>
                        <div className="text-xs opacity-75 mt-0.5">{etf.manager}</div>
                    </div>
                    <div className="text-right">
                        {etf.aum_100m_twd !== null && (
                            <div className="text-sm font-medium">
                                規模 {etf.aum_100m_twd.toFixed(1)} 億
                            </div>
                        )}
                        <div className="text-xs opacity-75 mt-1">
                            前10大合計權重 {topWeight.toFixed(2)}%
                        </div>
                    </div>
                </div>
            </div>

            {/* 持股表格 */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500 dark:text-slate-400">
                            <th className="px-3 py-2 text-left w-7">#</th>
                            <th className="px-3 py-2 text-left">代號</th>
                            <th className="px-3 py-2 text-left">名稱</th>
                            <th className="px-3 py-2 text-right">比重</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayedHoldings.map((h) => {
                            const isAll3 = overlapAll3.has(h.stock_code);
                            const isAny2 = overlapAny2.has(h.stock_code);
                            return (
                                <tr
                                    key={h.stock_code}
                                    className={[
                                        'border-t border-slate-100 dark:border-slate-700/50 hover:opacity-90 transition-colors',
                                        isAll3 ? 'bg-yellow-50/80 dark:bg-yellow-900/30' : '',
                                        isAny2 && !isAll3 ? 'bg-blue-50/80 dark:bg-blue-900/30' : '',
                                    ].join(' ')}
                                >
                                    <td className="px-3 py-2 text-slate-400 text-xs">{h.rank}</td>
                                    <td className="px-3 py-2 font-mono text-xs">
                                        <a
                                            href={`https://finance.yahoo.com/quote/${h.stock_code}.TW`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 dark:text-blue-400 hover:underline"
                                        >
                                            {h.stock_code}
                                        </a>
                                    </td>
                                    <td className="px-3 py-2 text-slate-800 dark:text-slate-200">
                                        {h.stock_name}
                                        {isAll3 && (
                                            <span className="ml-1.5 text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 px-1.5 py-0.5 rounded-full">3共</span>
                                        )}
                                        {isAny2 && !isAll3 && (
                                            <span className="ml-1.5 text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 px-1.5 py-0.5 rounded-full">2共</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2 text-right font-medium text-slate-700 dark:text-slate-300">
                                        {h.weight.toFixed(2)}%
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* 展開/收合按鈕 */}
            {hasMore && (
                <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-700/50">
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="w-full text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors py-1"
                    >
                        {expanded
                            ? '收合 ▲'
                            : `顯示全部 ${etf.holdings.length} 筆 ▼`}
                    </button>
                </div>
            )}

            {/* 產業分布 */}
            <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">產業分布</div>
                <SectorBar sectors={etf.sectors} />
            </div>
        </div>
    );
}

// ── 主元件 ───────────────────────────────────────────────────────────────────

export function EtfComparePanel({ etfs, overlap }: EtfComparePanelProps) {
    const overlapAll3 = useMemo(() => new Set(overlap.all3), [overlap.all3]);
    const overlapAny2 = useMemo(() => new Set(overlap.any2), [overlap.any2]);

    // 計算前10大持股的唯一股票數（取三ETF前10的聯集）
    const top10Codes = useMemo(() => {
        const codes = new Set<string>();
        etfs.forEach(e => e.holdings.slice(0, 10).forEach(h => codes.add(h.stock_code)));
        return codes.size;
    }, [etfs]);

    const { shown: shownAll3, remaining: remainingAll3 } = truncateList(overlap.all3, 5);
    const { shown: shownAny2, remaining: remainingAny2 } = truncateList(overlap.any2, 5);

    return (
        <div className="space-y-4">
            {/* 重疊比例摘要卡 */}
            <OverlapSummary
                all3Count={overlap.all3.length}
                any2Count={overlap.any2.length}
                top10Count={top10Codes}
            />

            {/* 交集說明 */}
            {(overlap.all3.length > 0 || overlap.any2.length > 0) && (
                <div className="flex flex-wrap gap-3 text-sm">
                    {overlap.all3.length > 0 && (
                        <div className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-lg px-3 py-2">
                            <span className="w-3 h-3 rounded-sm bg-yellow-400 shrink-0" />
                            <span className="text-yellow-800 dark:text-yellow-300">
                                三 ETF 共同持有：{shownAll3.join('、')}
                                {remainingAll3 > 0 && (
                                    <span className="ml-1 text-yellow-600 dark:text-yellow-400">+{remainingAll3} 支</span>
                                )}
                            </span>
                        </div>
                    )}
                    {overlap.any2.length > 0 && (
                        <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-lg px-3 py-2">
                            <span className="w-3 h-3 rounded-sm bg-blue-400 shrink-0" />
                            <span className="text-blue-800 dark:text-blue-300">
                                兩 ETF 共同持有：{shownAny2.join('、')}
                                {remainingAny2 > 0 && (
                                    <span className="ml-1 text-blue-600 dark:text-blue-400">+{remainingAny2} 支</span>
                                )}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* 三欄卡片 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {etfs.map((etf) => (
                    <EtfCard
                        key={etf.etf_code}
                        etf={etf}
                        overlapAll3={overlapAll3}
                        overlapAny2={overlapAny2}
                    />
                ))}
            </div>
        </div>
    );
}
