'use client';

import React, { useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { RankingTrendChart } from './RankingTrendChart';
import type { RankingDataRow } from './RankingTrendChart';
import { HoldingSparklineGrid } from './HoldingSparklineGrid';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PositionRow {
    stock_code: string;
    stock_name?: string;
    cost_basis: number;
    mv_now: number;
    pnl: number;
    pnl_pct: number;
    delta_days: number;
    first_entry_date: string;
    entry_price: number | null;
    curr_price: number | null;
    curr_shares: number;
    is_active: boolean;
    exit_date: string | null;
    realized_pnl_pct: number | null;
}

interface DiffLogRow {
    etf_code: string;
    data_date: string;
    stock_code: string;
    stock_name?: string;
    change_type: string;
    diff_shares: number | null;
    curr_shares: number | null;
    prev_weight: number | null;
    curr_weight: number | null;
}

interface DrilldownTabsProps {
    holdingsContent: React.ReactNode;
    ledgerContent: React.ReactNode;
    todayDiffs?: DiffLogRow[];
    positions?: PositionRow[];
    historyData?: RankingDataRow[];
    dataDate?: string;
}

const TIME_RANGE_OPTIONS = [
    { key: '3m' as const, label: '近3月' },
    { key: '6m' as const, label: '近6月' },
    { key: 'all' as const, label: '全部' },
];

const VIEW_OPTIONS = [
    { key: 'chart' as const, label: '折線圖' },
    { key: 'sparkline' as const, label: 'Sparkline' },
];

const VALID_TABS = ['holdings', 'today', 'history', 'entry', 'pnl', 'exited', 'ledger'] as const;
type TabId = typeof VALID_TABS[number];

const TAB_LABELS: Record<TabId, string> = {
    holdings: '目前持股',
    today:    '當日加減碼',
    history:  '歷史軌跡',
    entry:    '單股進出場',
    pnl:      '損益排行',
    exited:   '已出清',
    ledger:   '異動紀錄',
};

// ── 子 Tab 元件 ───────────────────────────────────────────────────────────────

function EmptyState({ message = '暫無資料' }: { message?: string }) {
    return (
        <div className="glass-card rounded-2xl p-12 text-center text-slate-400">
            <p>{message}</p>
            <p className="text-xs mt-2">執行 backfill 腳本後資料將自動填入</p>
        </div>
    );
}

const ACTION_LABELS: Record<string, string> = {
    BUY: '加碼', IN: '新建倉', SELL: '減碼', OUT: '出清',
};

function TodayDiffsTab({ diffs }: { diffs: DiffLogRow[] }) {
    if (!diffs.length) return <EmptyState message="今日無加減碼異動" />;

    const groups: Record<string, DiffLogRow[]> = { IN: [], BUY: [], SELL: [], OUT: [] };
    for (const d of diffs) groups[d.change_type]?.push(d);

    return (
        <div className="space-y-6">
            {(['IN', 'BUY', 'SELL', 'OUT'] as const).map(action => {
                const rows = groups[action];
                if (!rows.length) return null;
                const isPositive = action === 'BUY' || action === 'IN';
                return (
                    <div key={action}>
                        <h4 className={`text-sm font-semibold mb-3 ${isPositive ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {ACTION_LABELS[action]}（{rows.length} 檔）
                        </h4>
                        <div className="space-y-1.5">
                            {rows.map((d, i) => (
                                <div key={i} className="glass-card rounded-xl px-4 py-2.5 flex items-center gap-4 text-sm">
                                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 w-16">{d.stock_code}</span>
                                    <span className="text-slate-600 dark:text-slate-400 flex-1">{d.stock_name ?? ''}</span>
                                    {d.prev_weight != null && d.curr_weight != null && (
                                        <span className="text-xs text-slate-500">
                                            {d.prev_weight.toFixed(2)}% → {d.curr_weight.toFixed(2)}%
                                            <span className={`ml-1 font-medium ${isPositive ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                ({(d.curr_weight - d.prev_weight) >= 0 ? '+' : ''}{(d.curr_weight - d.prev_weight).toFixed(2)}pp)
                                            </span>
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function PositionsTab({ positions, activeOnly }: { positions: PositionRow[]; activeOnly: boolean }) {
    const filtered = positions.filter(p => activeOnly ? p.is_active : !p.is_active);
    if (!filtered.length) return <EmptyState />;

    const sorted = [...filtered].sort((a, b) => b.pnl_pct - a.pnl_pct);

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500 dark:text-slate-400">
                        <th className="px-3 py-2.5 text-left">代號</th>
                        <th className="px-3 py-2.5 text-right">張數</th>
                        <th className="px-3 py-2.5 text-right">進場日</th>
                        <th className="px-3 py-2.5 text-right">天數</th>
                        <th className="px-3 py-2.5 text-right">損益%</th>
                        {!activeOnly && <th className="px-3 py-2.5 text-right">出場日</th>}
                    </tr>
                </thead>
                <tbody>
                    {sorted.map(p => {
                        const pct = activeOnly ? p.pnl_pct : (p.realized_pnl_pct ?? p.pnl_pct);
                        const positive = pct >= 0;
                        return (
                            <tr key={p.stock_code} className="border-t border-slate-100 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                <td className="px-3 py-2.5 font-mono text-xs text-indigo-600 dark:text-indigo-400 font-bold">{p.stock_code}</td>
                                <td className="px-3 py-2.5 text-right text-slate-600 dark:text-slate-400">{p.curr_shares.toLocaleString()}</td>
                                <td className="px-3 py-2.5 text-right text-slate-500 text-xs">{p.first_entry_date}</td>
                                <td className="px-3 py-2.5 text-right text-slate-500">{p.delta_days}d</td>
                                <td className={`px-3 py-2.5 text-right font-medium ${positive ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                    {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                                </td>
                                {!activeOnly && <td className="px-3 py-2.5 text-right text-slate-500 text-xs">{p.exit_date ?? '—'}</td>}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function ExitedSummary({ positions }: { positions: PositionRow[] }) {
    const exited = positions.filter(p => !p.is_active);
    if (!exited.length) return null;
    const wins = exited.filter(p => (p.realized_pnl_pct ?? 0) > 0).length;
    const avgPct = exited.reduce((s, p) => s + (p.realized_pnl_pct ?? 0), 0) / exited.length;
    const avgDays = Math.round(exited.reduce((s, p) => s + p.delta_days, 0) / exited.length);
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
                { label: '出清標的', value: `${exited.length} 檔` },
                { label: '平均持倉', value: `${avgDays} 天` },
                { label: '平均損益', value: `${avgPct >= 0 ? '+' : ''}${avgPct.toFixed(2)}%`, positive: avgPct >= 0 },
                { label: '勝率', value: `${((wins / exited.length) * 100).toFixed(0)}%` },
            ].map(item => (
                <div key={item.label} className="glass-card rounded-xl p-3 text-center">
                    <div className="text-xs text-slate-400 mb-1">{item.label}</div>
                    <div className={`font-bold ${item.positive == null ? 'text-slate-800 dark:text-slate-200' : item.positive ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {item.value}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ── 主元件 ────────────────────────────────────────────────────────────────────

export function DrilldownTabs({
    holdingsContent,
    ledgerContent,
    todayDiffs = [],
    positions = [],
    historyData,
}: DrilldownTabsProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [historyView, setHistoryView] = useState<'chart' | 'sparkline'>('chart');
    const [timeRange, setTimeRange] = useState<'3m' | '6m' | 'all'>('all');

    const filteredHistoryData = useMemo(() => {
        if (!historyData || timeRange === 'all') return historyData ?? [];
        const days = timeRange === '3m' ? 90 : 180;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffStr = cutoff.toISOString().slice(0, 10);
        return historyData.filter(r => r.data_date >= cutoffStr);
    }, [historyData, timeRange]);

    const activeTab = useMemo<TabId>(() => {
        const tab = searchParams.get('tab') as TabId | null;
        return tab && (VALID_TABS as readonly string[]).includes(tab) ? tab : 'holdings';
    }, [searchParams]);

    const handleTabChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', value);
        router.push(`?${params.toString()}`, { scroll: false });
    };

    const triggerClass = "rounded-lg py-1.5 px-2 text-xs transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm";

    return (
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="flex flex-wrap gap-1 mb-6 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
                {VALID_TABS.map(tab => (
                    <TabsTrigger key={tab} value={tab} className={triggerClass}>
                        {TAB_LABELS[tab]}
                    </TabsTrigger>
                ))}
            </TabsList>

            <TabsContent value="holdings">{holdingsContent}</TabsContent>
            <TabsContent value="today"><TodayDiffsTab diffs={todayDiffs} /></TabsContent>
            <TabsContent value="history">
                {historyData ? (
                    <div>
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                                {TIME_RANGE_OPTIONS.map(opt => (
                                    <button
                                        key={opt.key}
                                        onClick={() => setTimeRange(opt.key)}
                                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                                            timeRange === opt.key
                                                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                                {VIEW_OPTIONS.map(opt => (
                                    <button
                                        key={opt.key}
                                        onClick={() => setHistoryView(opt.key)}
                                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                                            historyView === opt.key
                                                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {historyView === 'chart'
                            ? <RankingTrendChart data={filteredHistoryData} />
                            : <HoldingSparklineGrid data={historyData} timeRange={timeRange} />
                        }
                    </div>
                ) : <EmptyState message="歷史比重軌跡" />}
            </TabsContent>
            <TabsContent value="entry"><PositionsTab positions={positions} activeOnly={true} /></TabsContent>
            <TabsContent value="pnl">
                <div className="space-y-4">
                    {positions.length === 0
                        ? <EmptyState />
                        : <PositionsTab positions={[...positions].sort((a, b) => b.pnl_pct - a.pnl_pct)} activeOnly={false} />
                    }
                </div>
            </TabsContent>
            <TabsContent value="exited">
                <ExitedSummary positions={positions} />
                <PositionsTab positions={positions} activeOnly={false} />
            </TabsContent>
            <TabsContent value="ledger">{ledgerContent}</TabsContent>
        </Tabs>
    );
}
