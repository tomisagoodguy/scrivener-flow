'use client';

import React from 'react';
import { format, addDays, isSameDay } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { TrendingUp, Gift, AlertTriangle, Calendar } from 'lucide-react';
import { TodoTask } from '@/components/todo/types';
import { getHolidayByDate } from '@/utils/publicHolidays';

interface PipelineViewProps {
    tasks: TodoTask[];
}

/**
 * 未來 7 日預告（Pipeline 時間軸）
 */
export function PipelineView({ tasks }: PipelineViewProps) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
        <div className="glass-card p-6 relative overflow-hidden">
            <div className="absolute bottom-0 left-0 w-full h-1/2 bg-linear-to-t from-blue-50/30 to-transparent pointer-events-none" />

            {/* Header */}
            <div className="flex items-center gap-4 mb-6 relative z-10">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl shadow-sm border border-blue-100/50">
                    <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-lg font-black text-slate-800 tracking-tight">未來 7 日預告</h2>
                    <p className="text-[10px] text-slate-400 font-bold tracking-[0.2em] uppercase">Upcoming Workflow Pipeline</p>
                </div>
            </div>

            {/* 7-Day Horizontal Grid */}
            <div className="grid grid-cols-7 gap-3 relative z-10">
                {[0, 1, 2, 3, 4, 5, 6].map(offset => {
                    const date = addDays(today, offset);
                    const dayTasks = tasks.filter(t => isSameDay(t.date, date));
                    const isToday = offset === 0;
                    const holiday = getHolidayByDate(date);

                    return (
                        <div key={offset} className="flex flex-col gap-2 group/day min-w-0">
                            {/* Date Badge */}
                            <div className={`
                                rounded-2xl flex flex-col items-center justify-center py-2.5 transition-all duration-300
                                ${isToday
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                    : 'bg-white border border-slate-100 text-slate-400 group-hover/day:border-blue-200'}
                            `}>
                                <div className={`text-[10px] font-black uppercase ${isToday ? 'text-blue-100' : 'text-slate-400'}`}>
                                    {format(date, 'EEE', { locale: zhTW })}
                                </div>
                                <div className="text-lg font-black leading-none">
                                    {format(date, 'dd')}
                                </div>
                            </div>

                            {/* Holiday Badge */}
                            {holiday && (
                                <div className={`
                                    px-2 py-1.5 rounded-xl border text-center text-[10px] font-bold leading-tight
                                    ${holiday.type === 'workday'
                                        ? 'bg-red-50 border-red-200 text-red-600'
                                        : 'bg-blue-50 border-blue-200 text-blue-600'}
                                `}>
                                    {holiday.type === 'workday' ? '🏢' : '🎊'} {holiday.name}
                                </div>
                            )}

                            {/* Tasks */}
                            {dayTasks.length > 0 ? (
                                <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto custom-scrollbar">
                                {dayTasks.map(t => (
                                    <div key={t.id} className="p-2.5 rounded-xl bg-slate-50/50 border border-slate-100 hover:bg-white hover:shadow-md hover:border-blue-100 transition-all duration-200 cursor-pointer">
                                        <div className="font-bold text-slate-800 text-xs leading-tight line-clamp-2">{t.title}</div>
                                        <div className="mt-1.5">
                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest
                                                ${t.type === 'legal' ? 'bg-amber-100 text-amber-600' :
                                                    t.type === 'tax' ? 'bg-indigo-100 text-indigo-600' :
                                                        'bg-slate-200 text-slate-600'}
                                            `}>
                                                {t.type}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                </div>
                            ) : !holiday ? (
                                <div className="flex-1 flex items-center justify-center py-4 text-[10px] text-slate-200 font-medium italic">
                                    —
                                </div>
                            ) : null}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
