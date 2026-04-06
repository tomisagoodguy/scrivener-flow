'use client';

import { useState, useMemo } from 'react';
import {
    ClockIcon,
    TrendingUpIcon,
    TrendingDownIcon,
    TrashIcon,
    RocketIcon,
    CalendarIcon,
    LucideIcon
} from 'lucide-react';
import { DiffLogCard } from './DiffLogCard';
import { DiffLog } from '@/types/investment';
import { ETF_REGISTRY } from '@/lib/investment/etfRegistry';

interface DiffLedgerProps {
    logs: DiffLog[];
    showEtfFilter?: boolean;
}

export function DiffLedger({ logs, showEtfFilter = false }: DiffLedgerProps) {
    const [activeEtf, setActiveEtf] = useState<string | null>(null);

    const filteredLogs = useMemo(() => {
        if (!showEtfFilter || activeEtf === null) return logs;
        return logs.filter(l => (l as DiffLog & { etf_code?: string }).etf_code === activeEtf);
    }, [logs, showEtfFilter, activeEtf]);

    if (!logs || logs.length === 0) {
        return (
            <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                <ClockIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-400 font-medium">目前沒有異動紀錄</p>
            </div>
        );
    }

    const groupedLogs = filteredLogs.reduce((acc, log) => {
        if (!acc[log.data_date]) acc[log.data_date] = [];
        acc[log.data_date].push(log);
        return acc;
    }, {} as Record<string, DiffLog[]>);

    const sortedDates = Object.keys(groupedLogs)
        .sort((a, b) => b.localeCompare(a))
        .slice(0, 10);

    const getBehaviorTags = (stockCode: string, currentLog: DiffLog) => {
        const tags: { label: string; color: 'red' | 'green' | 'blue' | 'amber'; icon?: LucideIcon }[] = [];

        if (currentLog.change_type === 'IN') tags.push({ label: '首次建倉', color: 'red', icon: RocketIcon });
        if (currentLog.change_type === 'OUT') tags.push({ label: '全數清倉', color: 'green', icon: TrashIcon });
        if (currentLog.change_type === 'CLOSE') tags.push({ label: '大幅縮減', color: 'amber' });

        if (currentLog.diff_weight >= 0.5) tags.push({ label: '強力加碼', color: 'red', icon: TrendingUpIcon });
        else if (currentLog.diff_weight <= -0.5) tags.push({ label: '大筆調節', color: 'green', icon: TrendingDownIcon });

        const stockLogs = [...filteredLogs]
            .filter(l => l.stock_code === stockCode)
            .sort((a, b) => b.data_date.localeCompare(a.data_date));

        let buyStreak = 0;
        for (const l of stockLogs) {
            if (l.change_type === 'BUY' || l.change_type === 'IN') buyStreak++;
            else break;
        }
        if (buyStreak >= 3) tags.push({ label: `連 ${buyStreak} 買`, color: 'red' });

        let sellStreak = 0;
        for (const l of stockLogs) {
            if (l.change_type === 'SELL' || l.change_type === 'OUT') sellStreak++;
            else break;
        }
        if (sellStreak >= 3) tags.push({ label: `連 ${sellStreak} 賣`, color: 'green' });

        return tags;
    };

    return (
        <div className="space-y-6">
            {/* ETF filter chips */}
            {showEtfFilter && (
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={() => setActiveEtf(null)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                            activeEtf === null
                                ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900 dark:border-white'
                                : 'bg-white/60 text-slate-500 border-slate-200 hover:border-slate-300 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700'
                        }`}
                    >
                        全部
                    </button>
                    {ETF_REGISTRY.map(etf => (
                        <button
                            key={etf.code}
                            onClick={() => setActiveEtf(etf.code)}
                            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                                activeEtf === etf.code
                                    ? 'text-white border-transparent'
                                    : 'bg-white/60 text-slate-500 border-slate-200 hover:border-slate-300 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700'
                            }`}
                            style={activeEtf === etf.code ? { backgroundColor: etf.color, borderColor: etf.color } : undefined}
                        >
                            {etf.code}
                        </button>
                    ))}
                    <span className="text-xs text-slate-400 ml-auto">{filteredLogs.length} 筆紀錄</span>
                </div>
            )}

            <div className="space-y-12 pb-10">
                {sortedDates.map((date, dateIdx) => (
                    <div key={date} className="relative">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="bg-indigo-600 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-lg shadow-indigo-500/20 flex items-center gap-2">
                                <CalendarIcon size={14} />
                                {date}
                            </div>
                            <div className="h-px flex-1 bg-linear-to-r from-slate-200 to-transparent dark:from-slate-800" />
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                {groupedLogs[date].length} 次變動
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {groupedLogs[date].map((log, idx) => (
                                <DiffLogCard
                                    key={log.id}
                                    log={log}
                                    index={idx}
                                    dateIndex={dateIdx}
                                    getBehaviorTags={getBehaviorTags}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
