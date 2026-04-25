'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SignalBadge } from './SignalBadge';

// ── 型別 ──────────────────────────────────────────────────────────────────────

interface ByEtfEntry {
    net_flow: number;
    buy_count: number;
    sell_count: number;
}

interface FlowStock {
    stock_code: string;
    stock_name: string;
    total_nt: number;
    delta_shares: number;
    etf_count: number;
    by_etf: { etf_code: string; nt: number; kind: string }[];
}

interface FlowTotals {
    total_in_nt: number;
    total_out_nt: number;
    net_nt: number;
    stocks_count: number;
}

interface FlowData {
    data_date: string;
    etfs_covered: string[];
    etfs_lagging: string[];
    inflow: FlowStock[];
    outflow: FlowStock[];
    by_etf: Record<string, ByEtfEntry>;
    totals: FlowTotals;
}

// ── 工具 ──────────────────────────────────────────────────────────────────────

function nt2yi(nt: number): string {
    return (nt / 1e8).toFixed(2);
}

const KIND_LABELS: Record<string, string> = { IN: '建倉', BUY: '加碼', SELL: '減碼', OUT: '出清' };
const KIND_COLORS: Record<string, string> = {
    IN: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    BUY: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    SELL: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    OUT: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

// ── 子元件 ────────────────────────────────────────────────────────────────────

function SummaryBar({ totals, covered, total }: { totals: FlowTotals; covered: number; total: number }) {
    const netPositive = totals.net_nt >= 0;
    return (
        <div className="glass-card rounded-2xl p-4 flex flex-wrap gap-6 items-center text-sm">
            <div>
                <div className="text-xs text-slate-400 mb-0.5">總流入</div>
                <div className="font-bold text-rose-600 dark:text-rose-400">+{nt2yi(totals.total_in_nt)} 億</div>
            </div>
            <div>
                <div className="text-xs text-slate-400 mb-0.5">總流出</div>
                <div className="font-bold text-emerald-600 dark:text-emerald-400">-{nt2yi(totals.total_out_nt)} 億</div>
            </div>
            <div>
                <div className="text-xs text-slate-400 mb-0.5">淨流向</div>
                <div className={`font-bold ${netPositive ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {netPositive ? '+' : ''}{nt2yi(totals.net_nt)} 億
                </div>
            </div>
            <div>
                <div className="text-xs text-slate-400 mb-0.5">涉及股數</div>
                <div className="font-medium text-slate-700 dark:text-slate-300">{totals.stocks_count} 檔</div>
            </div>
            <div className="ml-auto text-xs text-slate-400">
                {covered}/{total} 家已揭露
            </div>
        </div>
    );
}

function LaggingBanner({ etfs }: { etfs: string[] }) {
    if (!etfs.length) return null;
    return (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl text-sm text-amber-700 dark:text-amber-300">
            <span>⚠️</span>
            <span>以下 ETF 尚未揭露今日資料：{etfs.join('、')}</span>
        </div>
    );
}

function FlowStockRow({ stock, isInflow }: { stock: FlowStock; isInflow: boolean }) {
    const [expanded, setExpanded] = useState(false);
    const isBasket = !isInflow && stock.by_etf.some(b => b.etf_code === '00981A'); // 00981A 被動操作提示

    return (
        <>
            <tr
                className="border-t border-slate-100 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors"
                onClick={() => setExpanded(e => !e)}
            >
                <td className="px-3 py-2.5 font-mono text-xs text-indigo-600 dark:text-indigo-400 font-bold">
                    {stock.stock_code}
                </td>
                <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300 text-sm">
                    {stock.stock_name}
                    {isBasket && <span className="ml-1 text-xs text-amber-500" title="00981A 被動操作">⚠️</span>}
                </td>
                <td className={`px-3 py-2.5 text-right font-medium ${isInflow ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {isInflow ? '+' : ''}{nt2yi(stock.total_nt)} 億
                </td>
                <td className="px-3 py-2.5 text-right text-slate-500 text-xs">{stock.etf_count} 支</td>
                <td className="px-3 py-2.5 text-center text-slate-400 text-xs">{expanded ? '▲' : '▼'}</td>
            </tr>
            {expanded && (
                <tr className="bg-slate-50/60 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-700/50">
                    <td colSpan={5} className="px-6 py-3">
                        <div className="flex flex-wrap gap-2">
                            {stock.by_etf.map((b, i) => (
                                <div key={i} className="flex items-center gap-1.5 text-xs">
                                    <span className="font-mono text-indigo-500">{b.etf_code}</span>
                                    <span className={`px-1.5 py-0.5 rounded text-xs ${KIND_COLORS[b.kind] ?? KIND_COLORS.BUY}`}>
                                        {KIND_LABELS[b.kind] ?? b.kind}
                                    </span>
                                    <span className="text-slate-500">{nt2yi(b.nt)} 億</span>
                                </div>
                            ))}
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}

function FlowTable({ stocks, isInflow, title }: { stocks: FlowStock[]; isInflow: boolean; title: string }) {
    if (!stocks.length) return null;
    return (
        <div>
            <h3 className={`text-sm font-semibold mb-2 ${isInflow ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {title}（{stocks.length} 檔）
            </h3>
            <div className="glass-card rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500 dark:text-slate-400">
                            <th className="px-3 py-2.5 text-left">代號</th>
                            <th className="px-3 py-2.5 text-left">名稱</th>
                            <th className="px-3 py-2.5 text-right">合計（億）</th>
                            <th className="px-3 py-2.5 text-right">ETF 數</th>
                            <th className="px-3 py-2.5 w-8" />
                        </tr>
                    </thead>
                    <tbody>
                        {stocks.map(s => (
                            <FlowStockRow key={s.stock_code} stock={s} isInflow={isInflow} />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function ByEtfView({ byEtf }: { byEtf: Record<string, ByEtfEntry> }) {
    const rows = Object.entries(byEtf).sort((a, b) => Math.abs(b[1].net_flow) - Math.abs(a[1].net_flow));
    if (!rows.length) return <p className="text-slate-400 text-sm">暫無資料</p>;
    return (
        <div className="glass-card rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500 dark:text-slate-400">
                        <th className="px-3 py-2.5 text-left">ETF</th>
                        <th className="px-3 py-2.5 text-right">淨流向（億）</th>
                        <th className="px-3 py-2.5 text-right">買入檔數</th>
                        <th className="px-3 py-2.5 text-right">賣出檔數</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(([etf, v]) => {
                        const pos = v.net_flow >= 0;
                        return (
                            <tr key={etf} className="border-t border-slate-100 dark:border-slate-700/50">
                                <td className="px-3 py-2.5 font-mono text-xs text-indigo-500 font-bold">{etf}</td>
                                <td className={`px-3 py-2.5 text-right font-medium ${pos ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                    {pos ? '+' : ''}{nt2yi(v.net_flow)}
                                </td>
                                <td className="px-3 py-2.5 text-right text-rose-500">{v.buy_count}</td>
                                <td className="px-3 py-2.5 text-right text-emerald-500">{v.sell_count}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

// ── 主元件 ────────────────────────────────────────────────────────────────────

interface DailyFlowPanelProps {
    totalEtfs: number;
    availableDates?: string[];
}

export function DailyFlowPanel({ totalEtfs, availableDates = [] }: DailyFlowPanelProps) {
    const [data, setData] = useState<FlowData | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [viewMode, setViewMode] = useState<'stock' | 'etf'>('stock');

    useEffect(() => {
        const supabase = createClient();
        const targetDate = selectedDate || undefined;

        setLoading(true);
        const query = supabase
            .from('etf_flow_daily')
            .select('data_date, etfs_covered, etfs_lagging, inflow, outflow, by_etf, totals')
            .order('data_date', { ascending: false })
            .limit(1);

        if (targetDate) query.eq('data_date', targetDate);

        query.then(({ data: rows }) => {
            setData((rows?.[0] ?? null) as FlowData | null);
            setLoading(false);
        });
    }, [selectedDate]);

    if (loading) return (
        <div className="glass-card rounded-2xl p-12 text-center text-slate-400 animate-pulse">載入資金流向資料中…</div>
    );

    if (!data) return (
        <div className="glass-card rounded-2xl p-12 text-center text-slate-400">
            <p>暫無資金流向資料</p>
            <p className="text-xs mt-2">執行 backfill_flow.py 後資料將自動填入</p>
        </div>
    );

    return (
        <div className="space-y-4">
            {/* 日期選擇器 */}
            <div className="flex items-center justify-between">
                <div className="text-sm text-slate-500 dark:text-slate-400">
                    資料日期：<strong className="text-slate-800 dark:text-slate-200">{data.data_date}</strong>
                </div>
                <div className="flex items-center gap-2">
                    {availableDates.length > 0 && (
                        <select
                            value={selectedDate}
                            onChange={e => setSelectedDate(e.target.value)}
                            className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        >
                            <option value="">最新</option>
                            {availableDates.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    )}
                    <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        {(['stock', 'etf'] as const).map(mode => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={`px-3 py-1 text-xs rounded transition-colors ${viewMode === mode ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm font-medium' : 'text-slate-500'}`}
                            >
                                {mode === 'stock' ? '個股維度' : '分 ETF 小計'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <LaggingBanner etfs={data.etfs_lagging} />
            <SummaryBar totals={data.totals} covered={data.etfs_covered.length} total={totalEtfs} />

            {viewMode === 'stock' ? (
                <div className="space-y-6">
                    <FlowTable stocks={data.inflow} isInflow={true} title="資金流入排行" />
                    <FlowTable stocks={data.outflow} isInflow={false} title="資金流出排行" />
                </div>
            ) : (
                <ByEtfView byEtf={data.by_etf} />
            )}
        </div>
    );
}
