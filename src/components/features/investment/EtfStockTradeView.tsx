'use client';

import React, { useState, useTransition } from 'react';
import { computeStockPnl } from '@/app/actions/investmentPnl';
import { CHANGE_TYPE_LABELS } from '@/types/investment';
import type { StockPnlResult } from '@/types/investment';
import { ManagerPnlCard, ManagerPnlCardSkeleton } from './ManagerPnlCard';
import { DualAxisChart } from './DualAxisChart';

function fmtNTValue(n: number): string {
    const abs = Math.abs(n);
    const sign = n < 0 ? '-' : '';
    if (abs >= 1e8) return `${sign}${(abs / 1e8).toFixed(2)} 億元`;
    if (abs >= 1e4) return `${sign}${Math.round(abs / 1e4).toLocaleString()} 萬元`;
    return `${sign}${Math.round(abs).toLocaleString()} 元`;
}

interface HoldingItem {
    stock_code: string;
    stock_name?: string | null;
    weight?: number | null;
    pnl_pct?: number | null;
}

interface EtfStockTradeViewProps {
    etfCode: string;
    holdings: HoldingItem[];
}

// Task 3.5: event timeline
function EventTimeline({ events }: { events: StockPnlResult['events'] }) {
    if (events.length === 0) {
        return (
            <div className="text-sm text-slate-400 py-4 text-center">
                尚無事件記錄
            </div>
        );
    }

    const sorted = [...events].sort((a, b) => b.date.localeCompare(a.date));

    const badgeClass: Record<string, string> = {
        IN:    'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
        BUY:   'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
        SELL:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
        TRIM:  'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
        OUT:   'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
        CLOSE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    };

    return (
        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
            {sorted.map((e, i) => (
                <div key={i} className="flex items-center gap-3 text-sm px-3 py-2 glass-card rounded-lg">
                    <span className="text-xs text-slate-500 w-24 shrink-0">{e.date}</span>
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded shrink-0 ${badgeClass[e.changeType] ?? badgeClass['IN']}`}>
                        {CHANGE_TYPE_LABELS[e.changeType] ?? e.changeType}
                    </span>
                    <span className="text-slate-600 dark:text-slate-400 tabular-nums shrink-0">
                        {e.diffShares >= 0 ? '+' : ''}{e.diffShares.toLocaleString()} 股
                    </span>
                    <span className="text-slate-400 text-xs tabular-nums ml-auto shrink-0">
                        ≈ {fmtNTValue(e.estimatedAmount)}
                    </span>
                </div>
            ))}
        </div>
    );
}

// Task 3.2: stock list item
function StockListItem({
    item,
    selected,
    onClick,
}: {
    item: HoldingItem;
    selected: boolean;
    onClick: () => void;
}) {
    const pct = item.pnl_pct;
    const positive = pct != null ? pct >= 0 : null;
    const pctColor = positive === null
        ? 'text-slate-400'
        : positive
            ? 'text-rose-600 dark:text-rose-400'
            : 'text-emerald-600 dark:text-emerald-400';

    return (
        <button
            onClick={onClick}
            className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                selected
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
        >
            <div className="flex items-center justify-between">
                <div>
                    <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {item.stock_code}
                    </span>
                    <span className="ml-1.5 text-xs text-slate-600 dark:text-slate-400">
                        {item.stock_name ?? ''}
                    </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <span className={`font-medium tabular-nums ${pctColor}`}>
                        {pct != null ? `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%` : 'N/A'}
                    </span>
                    {item.weight != null && (
                        <span className="text-slate-400 tabular-nums">
                            {item.weight.toFixed(2)}%
                        </span>
                    )}
                </div>
            </div>
        </button>
    );
}

// Task 3.1: EtfStockTradeView — dual-column layout
export function EtfStockTradeView({ etfCode, holdings }: EtfStockTradeViewProps) {
    const [selectedCode, setSelectedCode] = useState<string | null>(
        holdings[0]?.stock_code ?? null
    );
    const [pnlData, setPnlData] = useState<StockPnlResult | null>(null);
    const [isPending, startTransition] = useTransition();

    // Task 3.2: sort by pnl_pct descending, null last
    const sortedHoldings = [...holdings].sort((a, b) => {
        if (a.pnl_pct == null && b.pnl_pct == null) return 0;
        if (a.pnl_pct == null) return 1;
        if (b.pnl_pct == null) return -1;
        return b.pnl_pct - a.pnl_pct;
    });

    const handleSelect = (code: string) => {
        if (code === selectedCode) return;
        setSelectedCode(code);
        setPnlData(null);
        startTransition(async () => {
            const result = await computeStockPnl(etfCode, code);
            setPnlData(result);
        });
    };

    // Auto-load first stock
    React.useEffect(() => {
        if (sortedHoldings.length > 0 && !pnlData && !isPending) {
            const first = sortedHoldings[0]!;
            setSelectedCode(first.stock_code);
            startTransition(async () => {
                const result = await computeStockPnl(etfCode, first.stock_code);
                setPnlData(result);
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [etfCode]);

    return (
        <div className="flex gap-4 min-h-[480px]">
            {/* Task 3.2: left stock list */}
            <div className="w-56 shrink-0 space-y-0.5 overflow-y-auto max-h-[520px] pr-1">
                <div className="text-xs text-slate-400 px-3 pb-1 flex justify-between">
                    <span>代號 / 名稱</span>
                    <span>報酬率 / 權重</span>
                </div>
                {sortedHoldings.map(item => (
                    <StockListItem
                        key={item.stock_code}
                        item={item}
                        selected={selectedCode === item.stock_code}
                        onClick={() => handleSelect(item.stock_code)}
                    />
                ))}
            </div>

            {/* Task 3.3: right detail panel */}
            <div className="flex-1 min-w-0 space-y-4">
                {isPending || (!pnlData && selectedCode) ? (
                    <ManagerPnlCardSkeleton />
                ) : pnlData ? (
                    <>
                        <ManagerPnlCard result={pnlData} showEtfLabel={false} />

                        {/* Task 3.3: dual-axis chart */}
                        <div className="glass-card rounded-xl p-4">
                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                                股數 / 股價走勢
                            </h4>
                            <DualAxisChart
                                sharesHistory={pnlData.sharesHistory}
                                priceHistory={pnlData.priceHistory}
                                events={pnlData.events}
                            />
                        </div>

                        {/* Task 3.5: event timeline */}
                        <div className="glass-card rounded-xl p-4">
                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                                加減碼事件時間軸
                            </h4>
                            <EventTimeline events={pnlData.events} />
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-48 text-sm text-slate-400">
                        請從左側選擇股票
                    </div>
                )}
            </div>
        </div>
    );
}
