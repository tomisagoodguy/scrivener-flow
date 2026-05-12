'use client';

import Link from 'next/link';
import { useState } from 'react';

interface EtfEntry {
    etf_code: string;
    weight: number;
}

export interface ConsensusRow {
    stock_code: string;
    stock_name: string;
    etf_count: number;
    total_weight: number;
    etf_list: EtfEntry[];
}

interface Props {
    data: ConsensusRow[];
    date: string;
}

const ETF_COLORS: Record<string, string> = {
    '00981A': 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
    '00403A': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    '00980A': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    '00982A': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    '00984A': 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    '00985A': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
    '00986A': 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
    '00987A': 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300',
    '00988A': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    '00990A': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
    '00991A': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    '00992A': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    '00993A': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
    '00994A': 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300',
    '00995A': 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300',
    '00997A': 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
};

const FILTER_OPTIONS = [
    { label: '全部', value: 1 },
    { label: '2+ ETF', value: 2 },
    { label: '3+ ETF', value: 3 },
    { label: '4+ ETF', value: 4 },
];

export function ConsensusPanel({ data, date }: Props) {
    const [minCount, setMinCount] = useState(2);

    const filtered = data.filter((r) => r.etf_count >= minCount);

    return (
        <div className="space-y-4">
            {/* Sub-header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    {date
                        ? `資料日期：${date}　共 ${filtered.length} 檔被 ${minCount}+ 位經理人同時持有`
                        : '暫無資料，請先執行 ETF Pipeline'}
                </p>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">篩選：</span>
                    {FILTER_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => setMinCount(opt.value)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                                minCount === opt.value
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                                    : 'bg-white/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700/50 border border-slate-200 dark:border-slate-700'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <p className="text-slate-400 text-lg">尚無共識持股資料</p>
                    <p className="text-slate-400 text-sm mt-2">
                        請先執行{' '}
                        <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">
                            uv run python ETF/main.py
                        </code>{' '}
                        同步資料
                    </p>
                </div>
            ) : (
                <div className="glass-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/20 dark:border-slate-700/50 bg-white/30 dark:bg-slate-800/30">
                                    <th className="text-left p-4 font-semibold text-slate-600 dark:text-slate-300 w-8">#</th>
                                    <th className="text-left p-4 font-semibold text-slate-600 dark:text-slate-300">股票</th>
                                    <th className="text-center p-4 font-semibold text-slate-600 dark:text-slate-300">持有 ETF 數</th>
                                    <th className="text-right p-4 font-semibold text-slate-600 dark:text-slate-300">合計權重</th>
                                    <th className="text-left p-4 font-semibold text-slate-600 dark:text-slate-300">持有 ETF</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((row, idx) => (
                                    <tr
                                        key={row.stock_code}
                                        className="border-b border-white/10 dark:border-slate-700/30 hover:bg-white/40 dark:hover:bg-slate-800/30 transition-colors"
                                    >
                                        <td className="p-4 text-slate-400 dark:text-slate-500">{idx + 1}</td>
                                        <td className="p-4">
                                            <Link href={`/investment/stock/${row.stock_code}`} className="flex flex-col group">
                                                <span className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                    {row.stock_code}
                                                </span>
                                                {row.stock_name && (
                                                    <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                        {row.stock_name}
                                                    </span>
                                                )}
                                            </Link>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                                                row.etf_count >= 4
                                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                                    : row.etf_count >= 3
                                                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                            }`}>
                                                {row.etf_count}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right font-mono text-slate-700 dark:text-slate-300">
                                            {row.total_weight.toFixed(2)}%
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-wrap gap-1">
                                                {row.etf_list.map((e) => (
                                                    <span
                                                        key={e.etf_code}
                                                        className={`inline-block px-2 py-0.5 rounded-lg text-xs font-medium ${ETF_COLORS[e.etf_code] ?? 'bg-slate-100 text-slate-600'}`}
                                                    >
                                                        {e.etf_code}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
