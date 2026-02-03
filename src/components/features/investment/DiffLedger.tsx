'use client';

import { 
    ClockIcon, 
    ArrowRightIcon, 
    TrendingUpIcon, 
    TrendingDownIcon, 
    TrashIcon, 
    RocketIcon,
    CalendarIcon,
    TagIcon
} from 'lucide-react';
import { motion } from 'framer-motion';

interface DiffLog {
    id: string;
    data_date: string;
    change_type: 'IN' | 'OUT' | 'BUY' | 'SELL';
    stock_code: string;
    stock_name: string;
    diff_shares: number;
    diff_weight: number;
    description: string;
}

interface DiffLedgerProps {
    logs: DiffLog[];
}

export function DiffLedger({ logs }: DiffLedgerProps) {
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

    const sortedDates = Object.keys(groupedLogs).sort((a, b) => b.localeCompare(a));

    const getStatusConfig = (type: string) => {
        switch (type) {
            case 'IN':
                return {
                    icon: RocketIcon,
                    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
                    iconBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-800/50 dark:text-emerald-300',
                    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
                    label: '新增持股',
                    color: 'text-emerald-600'
                };
            case 'OUT':
                return {
                    icon: TrashIcon,
                    bg: 'bg-rose-50 dark:bg-rose-950/40',
                    iconBg: 'bg-rose-100 text-rose-600 dark:bg-rose-800/50 dark:text-rose-300',
                    badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
                    label: '剔除持股',
                    color: 'text-rose-600'
                };
            case 'BUY':
                return {
                    icon: TrendingUpIcon,
                    bg: 'bg-blue-50 dark:bg-blue-950/40',
                    iconBg: 'bg-blue-100 text-blue-600 dark:bg-blue-800/50 dark:text-blue-300',
                    badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
                    label: '加碼',
                    color: 'text-blue-600'
                };
            case 'SELL':
                return {
                    icon: TrendingDownIcon,
                    bg: 'bg-amber-50 dark:bg-amber-950/40',
                    iconBg: 'bg-amber-100 text-amber-600 dark:bg-amber-800/50 dark:text-amber-300',
                    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
                    label: '減碼',
                    color: 'text-amber-600'
                };
            default:
                return {
                    icon: ClockIcon,
                    bg: 'bg-slate-50',
                    iconBg: 'bg-slate-100 text-slate-600',
                    badge: 'bg-slate-500/10 text-slate-600',
                    label: '未知',
                    color: 'text-slate-600'
                };
        }
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
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {groupedLogs[date].map((log, idx) => {
                            const config = getStatusConfig(log.change_type);
                            const StatusIcon = config.icon;

                            return (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: (dateIdx * 0.1) + (idx * 0.05) }}
                                    key={log.id}
                                    className={`
                                        group relative overflow-hidden p-5 rounded-2xl border transition-all duration-300
                                        bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800
                                        hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-indigo-500/5
                                        hover:-translate-y-1 hover:border-slate-300 dark:hover:border-slate-700
                                    `}
                                >
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-5">
                                            {/* Status Icon */}
                                            <div className={`
                                                w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 
                                                shadow-sm transition-transform group-hover:scale-110
                                                ${config.iconBg}
                                            `}>
                                                <StatusIcon size={28} />
                                            </div>

                                            <div className="space-y-1">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-lg font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                        {log.stock_name}
                                                    </span>
                                                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded font-mono text-xs font-bold">
                                                        {log.stock_code}
                                                    </span>
                                                </div>
                                                
                                                <div className="flex items-center gap-2">
                                                    <span className={`
                                                        text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter border
                                                        ${config.badge}
                                                    `}>
                                                        {log.change_type}
                                                    </span>
                                                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                                        {log.change_type === 'IN' || log.change_type === 'OUT' 
                                                            ? config.label 
                                                            : `${config.label} ${Math.abs(log.diff_shares).toLocaleString()} 股`}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <div className={`text-xl font-mono font-black ${log.diff_weight > 0 ? 'text-emerald-500' : log.diff_weight < 0 ? 'text-rose-500' : 'text-slate-500'}`}>
                                                {log.diff_weight > 0 ? '▲' : log.diff_weight < 0 ? '▼' : ''}
                                                {Math.abs(log.diff_weight)}%
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-400 flex items-center justify-end gap-1">
                                                <TagIcon size={10} />
                                                權重變動
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Subtle hover background decoration */}
                                    <div className={`absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full opacity-[0.03] transition-opacity group-hover:opacity-[0.08] ${config.bg}`} />
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
