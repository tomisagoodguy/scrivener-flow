'use client';

import { 
    ClockIcon, 
    TrendingUpIcon, 
    TrendingDownIcon, 
    TrashIcon, 
    RocketIcon,
    CalendarIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DiffLogCard } from './DiffLogCard';
import { DiffLog } from '@/types/investment';

interface DiffLedgerProps {
    logs: DiffLog[];
}

export function DiffLedger({ logs }: DiffLedgerProps) {
    const router = useRouter();
    if (!logs || logs.length === 0) {
        return (
            <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                <ClockIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-400 font-medium">目前沒有異動紀錄</p>
            </div>
        );
    }

    // Group logs by date
    const groupedLogs = logs.reduce((acc, log) => {
        if (!acc[log.data_date]) {
            acc[log.data_date] = [];
        }
        acc[log.data_date].push(log);
        return acc;
    }, {} as Record<string, DiffLog[]>);

    const sortedDates = Object.keys(groupedLogs)
        .sort((a, b) => b.localeCompare(a))
        .slice(0, 10);

    const getBehaviorTags = (stockCode: string, currentLog: DiffLog) => {
        const tags: { label: string; color: 'red' | 'green' | 'blue' | 'amber'; icon?: any }[] = [];
        
        // 1. Action Types (IN/OUT)
        if (currentLog.change_type === 'IN') {
            tags.push({ label: '首次建倉', color: 'red', icon: RocketIcon });
        }
        if (currentLog.change_type === 'OUT') {
            tags.push({ label: '全數清倉', color: 'green', icon: TrashIcon });
        }

        // 2. Aggressive Intensity (Weight Diff)
        if (currentLog.diff_weight >= 0.5) {
            tags.push({ label: '強力加碼', color: 'red', icon: TrendingUpIcon });
        } else if (currentLog.diff_weight <= -0.5) {
            tags.push({ label: '大筆調節', color: 'green', icon: TrendingDownIcon });
        }

        // 3. Streak Analysis (Using the logs we have)
        // Sort all logs by date to check sequence for this specific stock
        const stockLogs = [...logs]
            .filter(l => l.stock_code === stockCode)
            .sort((a, b) => b.data_date.localeCompare(a.data_date));
        
        let buyStreak = 0;
        for (const l of stockLogs) {
            if (l.change_type === 'BUY' || l.change_type === 'IN') buyStreak++;
            else break;
        }
        if (buyStreak >= 3) {
            tags.push({ label: `連 ${buyStreak} 買`, color: 'red' });
        }

        let sellStreak = 0;
        for (const l of stockLogs) {
            if (l.change_type === 'SELL' || l.change_type === 'OUT') sellStreak++;
            else break;
        }
        if (sellStreak >= 3) {
            tags.push({ label: `連 ${sellStreak} 賣`, color: 'green' });
        }

        return tags;
    };

    return (
        <div className="space-y-12 pb-10">
            {sortedDates.map((date, dateIdx) => (
                <div key={date} className="relative">
                    {/* Date Header */}
                    <div className="flex items-center gap-4 mb-6">
                        <div className="bg-indigo-600 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-lg shadow-indigo-500/20 flex items-center gap-2">
                            <CalendarIcon size={14} />
                            {date}
                        </div>
                        <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent dark:from-slate-800" />
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            {groupedLogs[date].length} 次變動
                        </span>
                    </div>

                    {/* Bento Grid for Logs */}
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
    );
}
