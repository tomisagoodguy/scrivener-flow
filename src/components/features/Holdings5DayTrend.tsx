'use client';

import { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import type { Holdings5DayTrendResult, DailyDiffItem, CumulativeDiffItem } from '@/lib/investment/holdingsTrendUtils';

interface Props {
    data: Holdings5DayTrendResult;
}

function DeltaBadge({ delta }: { delta: number }) {
    const sign = delta > 0 ? '+' : '';
    const color = delta > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400';
    return <span className={`font-semibold ${color}`}>{sign}{delta.toFixed(2)}%</span>;
}

function SectionToggle({ open, onToggle, label }: { open: boolean; onToggle: () => void; label: string }) {
    return (
        <button onClick={onToggle} className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            {open ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
            {label}
        </button>
    );
}

function EmptyNote() {
    return <p className="text-sm text-slate-400 dark:text-slate-500 py-3">無符合條件的標的</p>;
}

function DailyDiffTable({ items }: { items: DailyDiffItem[] }) {
    if (items.length === 0) return <EmptyNote />;
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
                        <th className="text-left py-2 pr-3">代號</th>
                        <th className="text-left py-2 pr-3">名稱</th>
                        <th className="text-left py-2 pr-3">區間</th>
                        <th className="text-right py-2 pr-3">起始權重</th>
                        <th className="text-right py-2 pr-3">最新權重</th>
                        <th className="text-right py-2">變動</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {items.map((item, i) => (
                        <tr key={`${item.code}-${item.fromDate}-${item.toDate}-${i}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="py-2 pr-3 font-mono font-medium text-slate-800 dark:text-slate-200">{item.code}</td>
                            <td className="py-2 pr-3 text-slate-600 dark:text-slate-300 max-w-[8rem] truncate">{item.name}</td>
                            <td className="py-2 pr-3 text-xs text-slate-400 whitespace-nowrap">{item.fromDate.slice(5)} → {item.toDate.slice(5)}</td>
                            <td className="py-2 pr-3 text-right text-slate-600 dark:text-slate-300">{item.oldWeight.toFixed(2)}%</td>
                            <td className="py-2 pr-3 text-right text-slate-600 dark:text-slate-300">{item.newWeight.toFixed(2)}%</td>
                            <td className="py-2 text-right"><DeltaBadge delta={item.delta} /></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function CumulativeDiffSection({ items }: { items: CumulativeDiffItem[] }) {
    if (items.length === 0) return <EmptyNote />;
    return (
        <div className="space-y-4">
            {items.map(item => (
                <div key={item.code} className="rounded-lg bg-slate-50 dark:bg-slate-800/50 px-4 py-3">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 text-sm">{item.code}</span>
                        <span className="text-slate-500 dark:text-slate-400 text-sm">{item.name}</span>
                        <span className="ml-auto text-xs text-slate-400">今日 {item.todayWeight.toFixed(2)}%</span>
                    </div>
                    <div className="space-y-1">
                        {item.entries.map((entry, i) => (
                            <div key={`${entry.date}-${i}`} className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                <span>{entry.date.slice(5)}</span>
                                <span>{entry.pastWeight.toFixed(2)}%</span>
                                <DeltaBadge delta={entry.delta} />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

export function Holdings5DayTrend({ data }: Props) {
    const [dailyOpen, setDailyOpen] = useState(true);
    const [cumulOpen, setCumulOpen] = useState(true);

    if (data.insufficient) {
        return (
            <div className="glass-card rounded-2xl p-5">
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-2">近5日持股趨勢</h3>
                <p className="text-sm text-slate-400 dark:text-slate-500">資料不足（至少需要 2 天資料）</p>
            </div>
        );
    }

    const dateRange = data.dates.length >= 2
        ? `${data.dates[0].slice(5)} – ${data.dates[data.dates.length - 1].slice(5)}`
        : '';

    return (
        <div className="glass-card rounded-2xl p-5 space-y-5">
            <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">近5日持股趨勢</h3>
                {dateRange && <span className="text-xs text-slate-400">{dateRange}</span>}
            </div>

            <div>
                <SectionToggle open={dailyOpen} onToggle={() => setDailyOpen(v => !v)} label={`每日權重變動（±1% 以上，${data.dailyDiff.length} 筆）`} />
                {dailyOpen && <div className="mt-3"><DailyDiffTable items={data.dailyDiff} /></div>}
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                <SectionToggle open={cumulOpen} onToggle={() => setCumulOpen(v => !v)} label={`今日累積偏移（±3% 以上，${data.cumulativeDiff.length} 支）`} />
                {cumulOpen && <div className="mt-3"><CumulativeDiffSection items={data.cumulativeDiff} /></div>}
            </div>
        </div>
    );
}
