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
        <div className="glass-card p-8 flex flex-col relative overflow-hidden group min-h-[800px]">
            <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-blue-50/30 to-transparent pointer-events-none" />

            <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shadow-sm border border-blue-100/50">
                        <TrendingUp className="w-7 h-7" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                            未來 7 日預告
                        </h2>
                        <p className="text-[10px] text-slate-400 font-bold tracking-[0.2em] uppercase">
                            Upcoming Workflow Pipeline
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex-1 relative z-10 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                {/* Visual Timeline Line */}
                <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-slate-100" />

                <div className="space-y-8 relative">
                    {[0, 1, 2, 3, 4, 5, 6].map(offset => {
                        const date = addDays(today, offset);
                        const dayTasks = tasks.filter(t => isSameDay(t.date, date));
                        const isToday = offset === 0;
                        const holiday = getHolidayByDate(date); // 取得政府假期

                        return (
                            <div key={offset} className="flex gap-6 relative group/day">
                                <div className={`
                                            w-12 h-14 rounded-2xl flex flex-col items-center justify-center z-10 transition-all duration-500
                                            ${isToday
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-110'
                                        : 'bg-white border border-slate-100 text-slate-400 group-hover/day:border-blue-200'}
                                        `}>
                                    <div className={`text-[10px] font-black uppercase ${isToday ? 'text-blue-100' : 'text-slate-400'}`}>
                                        {format(date, 'EEE', { locale: zhTW })}
                                    </div>
                                    <div className="text-xl font-black leading-none">
                                        {format(date, 'dd')}
                                    </div>
                                </div>

                                <div className="flex-1 space-y-3">
                                    {/* 假期卡片（優先顯示） */}
                                    {holiday && (
                                        <div className={`
                                                    p-4 rounded-[20px] border-2 transition-all duration-300 cursor-pointer
                                                    ${holiday.type === 'workday'
                                                ? 'bg-gradient-to-br from-red-50 to-orange-50 border-red-200 hover:shadow-lg hover:shadow-red-100'
                                                : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 hover:shadow-lg hover:shadow-blue-100'
                                            }
                                                `}>
                                            <div className="flex items-center gap-3">
                                                {holiday.type === 'workday' ? (
                                                    <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                                                        <AlertTriangle className="w-5 h-5 text-red-600" />
                                                    </div>
                                                ) : (
                                                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                                                        <Gift className="w-5 h-5 text-blue-600" />
                                                    </div>
                                                )}
                                                <div className="flex-1">
                                                    <div className={`font-black tracking-tight ${holiday.type === 'workday' ? 'text-red-700' : 'text-blue-700'
                                                        }`}>
                                                        {holiday.name}
                                                    </div>
                                                    <div className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${holiday.type === 'workday' ? 'text-red-500' : 'text-blue-500'
                                                        }`}>
                                                        {holiday.type === 'workday' ? '🏢 需上班' : '🎊 政府假期'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* 待辦事項卡片 */}
                                    {dayTasks.length > 0 ? (
                                        dayTasks.map(t => (
                                            <div key={t.id} className="p-4 rounded-[20px] bg-slate-50/50 border border-slate-100 hover:bg-white hover:shadow-xl hover:border-blue-100 transition-all duration-300 cursor-pointer">
                                                <div className="font-bold text-slate-800 tracking-tight">{t.title}</div>
                                                <div className="flex items-center justify-between mt-2">
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.caseName || '個人事項'}</span>
                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest
                                                                ${t.type === 'legal' ? 'bg-amber-100 text-amber-600' :
                                                            t.type === 'tax' ? 'bg-indigo-100 text-indigo-600' :
                                                                'bg-slate-200 text-slate-600'}
                                                            `}>
                                                        {t.type}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    ) : !holiday ? (
                                        <div className="h-14 flex items-center text-xs text-slate-300 font-medium italic pl-4">
                                            無安排事項
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
