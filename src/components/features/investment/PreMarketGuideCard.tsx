'use client';

import { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import Link from 'next/link';
import { getEtfMeta } from '@/lib/investment/etfRegistry';

// ── 型別（與 Server 端共用，複製即可）────────────────────────────────────────

export interface FlowStockSummary {
    stock_code: string;
    stock_name: string;
    total_nt: number;
    etf_count: number;
    etf_codes: string[];
}

export interface GuideData {
    displayDate: string;
    coveredCount: number;
    totalEtfs: number;
    consensusBuys: FlowStockSummary[];
    singleBets: FlowStockSummary[];
    consensusSells: FlowStockSummary[];
    netNt: number;
    totalInNt: number;
    totalOutNt: number;
    isBasketBuy: boolean;
    basketPct: number;
    basketEtf: string;
    stocksCount: number;
}

// ── 工具 ──────────────────────────────────────────────────────────────────────

function nt2yi(nt: number): string {
    const abs = Math.abs(nt);
    if (abs >= 1e8) return `${(nt / 1e8).toFixed(1)}億`;
    return `${(nt / 1e4).toFixed(0)}萬`;
}

// ── 股票行 ────────────────────────────────────────────────────────────────────

function StockRow({ stock, isInflow, rank, label, stockList }: { stock: FlowStockSummary; isInflow: boolean; rank: number; label: string; stockList: string }) {
    const href = `/investment/stock/${stock.stock_code}?from=${encodeURIComponent(label)}&rank=${rank}&list=${stockList}`;
    return (
        <div className="flex items-center gap-2 py-1">
            <Link href={href} className="font-mono text-xs text-indigo-500 dark:text-indigo-400 w-11 shrink-0 hover:underline hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">{stock.stock_code}</Link>
            <span className="text-sm text-slate-700 dark:text-slate-300 w-20 shrink-0 truncate">{stock.stock_name}</span>
            <span className={`text-sm font-semibold w-16 text-right shrink-0 tabular-nums ${isInflow ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {isInflow ? '+' : ''}{nt2yi(stock.total_nt)}
            </span>
            <div className="flex flex-wrap gap-1 min-w-0">
                {stock.etf_codes.map(code => {
                    const color = getEtfMeta(code)?.color ?? '#6366f1';
                    return (
                        <span
                            key={code}
                            className="px-1.5 py-0.5 rounded text-[11px] font-mono leading-tight"
                            style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}55` }}
                        >
                            {code}
                        </span>
                    );
                })}
            </div>
            <span className="ml-auto text-xs text-slate-400 dark:text-slate-500 shrink-0">{stock.etf_count} 家</span>
        </div>
    );
}

// ── 可展開區塊 ────────────────────────────────────────────────────────────────

const DEFAULT_SHOW = 5;

function ExpandableSection({
    title,
    color,
    stocks,
    isInflow,
    emptyText,
    label,
}: {
    title: string;
    color: 'rose' | 'emerald' | 'amber';
    stocks: FlowStockSummary[];
    isInflow: boolean;
    emptyText: string;
    label: string;
}) {
    const [expanded, setExpanded] = useState(false);
    const hasMore = stocks.length > DEFAULT_SHOW;
    const visible = expanded ? stocks : stocks.slice(0, DEFAULT_SHOW);
    const stockList = stocks.map(s => s.stock_code).join(',');

    const titleColorClass = {
        rose: 'text-rose-600 dark:text-rose-400',
        emerald: 'text-emerald-600 dark:text-emerald-400',
        amber: 'text-amber-600 dark:text-amber-400',
    }[color];

    return (
        <div>
            <div className={`text-xs font-semibold uppercase tracking-wide mb-1.5 flex items-center gap-1.5 ${titleColorClass}`}>
                {title}
                {stocks.length > 0 && (
                    <span className="font-normal text-slate-400 dark:text-slate-500 normal-case tracking-normal">
                        {stocks.length} 檔
                    </span>
                )}
            </div>

            {stocks.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-700/40">
                    {visible.map((s, i) => (
                        <StockRow key={s.stock_code} stock={s} isInflow={isInflow} rank={i + 1} label={label} stockList={stockList} />
                    ))}
                </div>
            ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500">{emptyText}</p>
            )}

            {hasMore && (
                <button
                    onClick={() => setExpanded(e => !e)}
                    className="mt-1.5 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                    {expanded ? (
                        <>
                            <ChevronUpIcon className="w-3.5 h-3.5" />
                            收合
                        </>
                    ) : (
                        <>
                            <ChevronDownIcon className="w-3.5 h-3.5" />
                            還有 {stocks.length - DEFAULT_SHOW} 檔…
                        </>
                    )}
                </button>
            )}
        </div>
    );
}

// ── 主 Card（Client Component）────────────────────────────────────────────────

export function PreMarketGuideCard({ data }: { data: GuideData }) {
    const netPositive = data.netNt >= 0;

    return (
        <div className="glass-card rounded-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">盤前指引</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">· {data.displayDate} ·</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">{data.coveredCount}/{data.totalEtfs} 家已揭露</span>
                </div>
            </div>

            {/* Body：2 欄 */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-700/50">
                {/* 左：共識買進 + 集中加碼 */}
                <div className="px-4 py-3 space-y-4">
                    <ExpandableSection
                        title="共識買進"
                        color="rose"
                        stocks={data.consensusBuys}
                        isInflow
                        emptyText="無 3 家以上共識"
                        label="共識買進"
                    />
                    {data.singleBets.length > 0 && (
                        <ExpandableSection
                            title="集中加碼"
                            color="amber"
                            stocks={data.singleBets}
                            isInflow
                            emptyText=""
                            label="集中加碼"
                        />
                    )}
                </div>

                {/* 右：共識賣 */}
                <div className="px-4 py-3">
                    <ExpandableSection
                        title="共識賣"
                        color="emerald"
                        stocks={data.consensusSells}
                        isInflow={false}
                        emptyText={`無 — 沒有任何一檔被 3 家以上同時減碼`}
                        label="共識賣"
                    />
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50/60 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-700/50 flex-wrap">
                <span className="text-xs text-slate-500 dark:text-slate-400">主動 ETF 淨流向</span>
                <span className={`text-base font-bold tabular-nums ${netPositive ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {netPositive ? '+' : ''}{nt2yi(data.netNt)}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                    流入 {nt2yi(data.totalInNt)} ／ 流出 {nt2yi(data.totalOutNt)}
                </span>
                {data.isBasketBuy && (
                    <span className="ml-auto text-xs text-amber-600 dark:text-amber-400 font-medium">
                        ⚠ {data.basketPct}% basket buy {data.basketEtf}
                    </span>
                )}
            </div>
        </div>
    );
}
