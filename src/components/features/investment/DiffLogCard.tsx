'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    ClockIcon,
    ArrowRightIcon,
    TrendingUpIcon,
    TrendingDownIcon,
    TrashIcon,
    RocketIcon,
    MinusCircleIcon,
    LucideIcon,
} from 'lucide-react';

import { DiffLog } from '@/types/investment';

export interface DiffLogCardProps {
    log: DiffLog;
    index: number;
    dateIndex: number;
    getBehaviorTags: (stockCode: string, currentLog: DiffLog) => { label: string; color: 'red' | 'green' | 'blue' | 'amber'; icon?: LucideIcon }[];
}

export function DiffLogCard({ log, index, dateIndex, getBehaviorTags }: DiffLogCardProps) {
    const router = useRouter();

    const getStatusConfig = (type: string) => {
        switch (type) {
            case 'IN':
                return {
                    icon: RocketIcon,
                    bg: 'bg-rose-50 dark:bg-rose-950/40',
                    iconBg: 'bg-rose-100 text-rose-600 dark:bg-rose-800/50 dark:text-rose-300',
                    badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
                    label: '新增持股',
                    color: 'text-rose-600'
                };
            case 'OUT':
                return {
                    icon: TrashIcon,
                    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
                    iconBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-800/50 dark:text-emerald-300',
                    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
                    label: '剔除持股',
                    color: 'text-emerald-600'
                };
            case 'BUY':
                return {
                    icon: TrendingUpIcon,
                    bg: 'bg-rose-50 dark:bg-rose-950/40',
                    iconBg: 'bg-rose-100 text-rose-600 dark:bg-rose-800/50 dark:text-rose-300',
                    badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
                    label: '加碼',
                    color: 'text-rose-600'
                };
            case 'SELL':
                return {
                    icon: TrendingDownIcon,
                    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
                    iconBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-800/50 dark:text-emerald-300',
                    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
                    label: '減碼',
                    color: 'text-emerald-600'
                };
            case 'CLOSE':
                return {
                    icon: MinusCircleIcon,
                    bg: 'bg-amber-50 dark:bg-amber-950/40',
                    iconBg: 'bg-amber-100 text-amber-600 dark:bg-amber-800/50 dark:text-amber-300',
                    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
                    label: '大幅縮減',
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

    const config = getStatusConfig(log.change_type);
    const StatusIcon = config.icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileHover={{ 
                y: -4,
                scale: 1.02,
                transition: { duration: 0.2 } 
            }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (dateIndex * 0.1) + (index * 0.05) }}
            onClick={() => router.push(`/investment/stock/${log.stock_code}`)}
            className={`
                group relative overflow-hidden p-5 rounded-2xl border transition-all duration-300 cursor-pointer
                bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800
                hover:shadow-2xl hover:shadow-indigo-500/10 dark:hover:shadow-indigo-500/10
                hover:border-indigo-500/30 dark:hover:border-indigo-400/30
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
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-lg font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {log.stock_name}
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded font-mono text-[10px] font-bold">
                                    {log.stock_code}
                                </span>
                                {log.industry && (
                                    <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded text-[10px] font-bold border border-indigo-100 dark:border-indigo-800/50">
                                        {log.industry}
                                    </span>
                                )}
                                {log.rank && (
                                    <span className="px-2 py-0.5 bg-slate-800 dark:bg-slate-700 text-slate-100 rounded text-[10px] font-bold font-mono">
                                        Rank {log.rank}
                                    </span>
                                )}
                            </div>
                        </div>
                        
                         <div className="flex flex-wrap items-center gap-2">
                             <span className={`
                                 text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter border
                                 ${config.badge}
                             `}>
                                 {log.change_type}
                             </span>
                             <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                 {log.change_type === 'IN' || log.change_type === 'OUT' || log.change_type === 'CLOSE'
                                     ? config.label
                                     : `${config.label} ${Math.abs(log.diff_shares).toLocaleString()} 股`}
                             </span>
                         </div>

                         {/* Manager Behavior Tags */}
                         <div className="flex flex-wrap gap-1.5 pt-1">
                             {getBehaviorTags(log.stock_code, log).map((tag, tIdx) => (
                                 <div 
                                    key={tIdx}
                                    className={`
                                        flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border
                                        ${tag.color === 'red'
                                            ? 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:border-rose-800'
                                            : tag.color === 'amber'
                                            ? 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800'
                                            : 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800'
                                        }
                                    `}
                                 >
                                     {tag.icon && <tag.icon size={10} />}
                                     {tag.label}
                                 </div>
                             ))}
                         </div>
                    </div>
                </div>

                <div className="text-right">
                    <div className={`text-xl font-mono font-black ${log.diff_weight > 0 ? 'text-rose-500' : log.diff_weight < 0 ? 'text-emerald-500' : 'text-slate-500'}`}>
                        {log.diff_weight > 0 ? '▲' : log.diff_weight < 0 ? '▼' : ''}
                        {Math.abs(log.diff_weight)}%
                    </div>
                    {(log.prev_weight != null || log.curr_weight != null) ? (
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                            {log.prev_weight ?? '—'}% → {log.curr_weight ?? '—'}%
                        </div>
                    ) : (
                        <div className="text-[10px] font-bold text-slate-400 flex items-center justify-end gap-1">
                            <div className="flex -space-x-1 mr-1">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className={`w-1 h-1 rounded-full ${log.diff_weight > 0 ? 'bg-rose-400' : 'bg-emerald-400'} opacity-${60 - (i*20)}`} />
                                ))}
                            </div>
                            權重變動
                        </div>
                    )}
                </div>
            </div>
            
            {/* Action Link Hint */}
            <div className="absolute bottom-2 right-4 flex items-center gap-1 text-[8px] font-black text-slate-300 dark:text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-tighter">
                View Dashboard <ArrowRightIcon size={8} />
            </div>
            
            {/* Subtle hover background decoration */}
            <div className={`absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full opacity-[0.03] transition-opacity group-hover:opacity-[0.08] ${config.bg}`} />
        </motion.div>
    );
}
