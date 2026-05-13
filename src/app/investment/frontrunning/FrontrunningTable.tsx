'use client';

import { useState, useMemo } from 'react';
import type { FrontrunningEvent } from '@/app/actions/getEtfFrontrunningEvents';

interface Props {
    events: FrontrunningEvent[];
}

function formatRatio(val: number | null): { text: string; rose: boolean } {
    if (val === null) return { text: '—', rose: false };
    return { text: `${val.toFixed(2)}×`, rose: val >= 2.0 };
}

export default function FrontrunningTable({ events }: Props) {
    const etfCodes = useMemo(() => {
        const set = new Set(events.map((e) => e.etf_code));
        return ['全部', ...Array.from(set).sort()];
    }, [events]);

    const [etfFilter, setEtfFilter] = useState('全部');
    const [stockFilter, setStockFilter] = useState('');

    const filtered = useMemo(() => {
        return events.filter((e) => {
            if (etfFilter !== '全部' && e.etf_code !== etfFilter) return false;
            if (stockFilter && !e.stock_code.includes(stockFilter.trim())) return false;
            return true;
        });
    }, [events, etfFilter, stockFilter]);

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <select
                    value={etfFilter}
                    onChange={(e) => setEtfFilter(e.target.value)}
                    className="bg-white/50 backdrop-blur-sm border border-gray-200 focus:bg-white rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-300 outline-none"
                >
                    {etfCodes.map((code) => (
                        <option key={code} value={code}>{code}</option>
                    ))}
                </select>
                <input
                    type="text"
                    value={stockFilter}
                    onChange={(e) => setStockFilter(e.target.value)}
                    placeholder="股票代碼搜尋..."
                    className="bg-white/50 backdrop-blur-sm border border-gray-200 focus:bg-white rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-300 outline-none w-40"
                />
                <span className="self-center text-xs text-slate-400">{filtered.length} 筆</span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-white/50 dark:border-slate-700/50">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-white/60 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                            <th className="px-4 py-3 text-left">ETF</th>
                            <th className="px-4 py-3 text-left">股票</th>
                            <th className="px-4 py-3 text-left">日期</th>
                            <th className="px-4 py-3 text-right">張數</th>
                            <th className="px-4 py-3 text-right">持股比重變化</th>
                            <th className="px-4 py-3 text-center">操作</th>
                            <th className="px-4 py-3 text-right" title="公告當天量比平均">當天量比</th>
                            <th className="px-4 py-3 text-right" title="公告次日量比平均">次日量比</th>
                            <th className="px-4 py-3 text-right" title="公告後第二日量比平均">隔日量比</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filtered.map((ev, i) => {
                            const r0 = formatRatio(ev.r_t0);
                            const r1 = formatRatio(ev.r_t1);
                            const r2 = formatRatio(ev.r_t2);
                            return (
                                <tr key={i} className="bg-white/40 dark:bg-slate-900/40 hover:bg-white/70 dark:hover:bg-slate-800/60 transition-colors">
                                    <td className="px-4 py-2.5 font-bold text-blue-600 dark:text-blue-400">{ev.etf_code}</td>
                                    <td className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-200">{ev.stock_code}</td>
                                    <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{ev.event_date}</td>
                                    <td className="px-4 py-2.5 text-right font-mono text-slate-700 dark:text-slate-200">
                                        {Math.round(Math.abs(ev.delta_shares) / 1000).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-mono text-slate-600 dark:text-slate-300">
                                        {ev.delta_pct !== null ? `${ev.delta_pct.toFixed(2)}%` : '—'}
                                    </td>
                                    <td className="px-4 py-2.5 text-center">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ev.is_new_position ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'}`}>
                                            {ev.is_new_position ? '新倉' : '加碼'}
                                        </span>
                                    </td>
                                    <td className={`px-4 py-2.5 text-right font-mono font-semibold ${r0.rose ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300'}`}>
                                        {r0.text}
                                    </td>
                                    <td className={`px-4 py-2.5 text-right font-mono font-semibold ${r1.rose ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300'}`}>
                                        {r1.text}
                                    </td>
                                    <td className={`px-4 py-2.5 text-right font-mono font-semibold ${r2.rose ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300'}`}>
                                        {r2.text}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
