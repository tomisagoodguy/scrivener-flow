'use client';

import React, { useState, useMemo } from 'react';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    addMonths,
    subMonths,
    isSameMonth,
    isSameDay,
    isWeekend,
} from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { TimelineEvent } from './constants';
import { TimelineEventBadge } from './TimelineEventBadge';

interface MonthCalendarProps {
    events: TimelineEvent[];
    today: Date;
}

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

/**
 * ② 月曆格 — 本月全覽，點擊日期展開事件清單
 */
export function MonthCalendar({ events, today }: MonthCalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(today);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    // 月曆天數陣列（包含前後月的填充天）
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        const start = startOfWeek(monthStart, { weekStartsOn: 1 });
        const end = endOfWeek(monthEnd, { weekStartsOn: 1 });
        return eachDayOfInterval({ start, end });
    }, [currentMonth]);

    // 事件按日期索引
    const eventsByDate = useMemo(() => {
        const map = new Map<string, TimelineEvent[]>();
        events.forEach((evt) => {
            const key = format(evt.date, 'yyyy-MM-dd');
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(evt);
        });
        return map;
    }, [events]);

    // 選中日期的事件
    const selectedEvents = selectedDate ? eventsByDate.get(selectedDate) || [] : [];

    return (
        <div className="glass-card overflow-hidden">
            {/* Header — 月份切換 */}
            <div className="flex items-center justify-between p-5 pb-3">
                <div className="flex items-center gap-3">
                    <span className="text-lg">🗓️</span>
                    <h3 className="text-[15px] font-black text-slate-800 dark:text-slate-200">
                        {format(currentMonth, 'yyyy 年 M 月', { locale: zhTW })}
                    </h3>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-400 hover:text-slate-600"
                    >
                        ←
                    </button>
                    <button
                        onClick={() => setCurrentMonth(today)}
                        className="px-3 py-1.5 rounded-xl text-[11px] font-black bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                    >
                        本月
                    </button>
                    <button
                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-400 hover:text-slate-600"
                    >
                        →
                    </button>
                </div>
            </div>

            {/* 星期 Header */}
            <div className="grid grid-cols-7 px-5">
                {WEEKDAYS.map((d) => (
                    <div key={d} className="text-center text-[11px] font-black text-slate-400 uppercase tracking-wider py-2">
                        {d}
                    </div>
                ))}
            </div>

            {/* 日期格 */}
            <div className="grid grid-cols-7 gap-px bg-slate-100 dark:bg-slate-800 mx-5 mb-4 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
                {calendarDays.map((day) => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const dayEvents = eventsByDate.get(dateKey) || [];
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isToday = isSameDay(day, today);
                    const isSelected = selectedDate === dateKey;
                    const isWknd = isWeekend(day);
                    const hasMilestone = dayEvents.some((e) => e.category === 'milestone');
                    const hasTax = dayEvents.some((e) => e.category === 'tax_deadline');
                    const hasAppt = dayEvents.some((e) => e.category === 'appointment');

                        return (
                            <button
                                key={dateKey}
                                onClick={() => setSelectedDate(isSelected ? null : dateKey)}
                                className={`
                                    relative flex flex-col items-center p-1.5 min-h-[72px] transition-all
                                    ${isCurrentMonth ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/50 dark:bg-slate-900/40'}
                                    ${isSelected ? 'ring-2 ring-blue-500 ring-inset z-10' : ''}
                                    ${isToday ? 'bg-blue-50/50 dark:bg-amber-400/10' : ''}
                                    hover:bg-slate-50 dark:hover:bg-slate-700/80
                                `}
                            >
                                {/* 日期數字 - 加上圓形外框 (日光:藍底白字, 黑夜:黃底黑字) */}
                                <div
                                    className={`
                                        flex items-center justify-center w-7 h-7 rounded-full text-[13px] font-black mb-1 transition-all
                                        ${isToday ? 'bg-blue-600 text-white dark:bg-yellow-400 dark:text-slate-900 shadow-[0_0_15px_rgba(250,204,21,0.4)]' : ''}
                                        ${!isToday && !isCurrentMonth ? 'text-slate-300 dark:text-slate-600' : ''}
                                        ${!isToday && isCurrentMonth && isWknd ? 'text-slate-400 dark:text-slate-400' : ''}
                                        ${!isToday && isCurrentMonth && !isWknd ? 'text-slate-700 dark:text-slate-100' : ''}
                                    `}
                                >
                                    {format(day, 'd')}
                                </div>

                                {/* 今天標記 - 右上角小點 (日光:藍, 黑夜:黃) */}
                                {isToday && (
                                    <div className="absolute top-1 right-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-yellow-400 block shadow-sm animate-pulse" />
                                    </div>
                                )}

                            {/* 事件點 */}
                            {dayEvents.length > 0 && (
                                <div className="flex flex-wrap gap-0.5 justify-center mt-auto">
                                    {hasMilestone && (
                                        <span className="w-2 h-2 rounded-sm bg-indigo-500" title="里程碑" />
                                    )}
                                    {hasTax && (
                                        <span className="w-0 h-0 border-l-4 border-r-4 border-b-[6px] border-l-transparent border-r-transparent border-b-rose-500" title="稅單截止" />
                                    )}
                                    {hasAppt && (
                                        <span className="w-2 h-2 rounded-full bg-emerald-400" title="約客" />
                                    )}
                                    {dayEvents.length > 3 && (
                                        <span className="text-[8px] font-black text-slate-400">+{dayEvents.length - 3}</span>
                                    )}
                                </div>
                            )}

                            {/* 事件數 */}
                            {dayEvents.length > 0 && (
                                <span className="text-[9px] font-bold text-slate-400 mt-0.5">
                                    {dayEvents.length}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* 底部：選中日期的事件展開 */}
            {selectedDate && selectedEvents.length > 0 && (
                <div className="border-t border-slate-100 dark:border-slate-800 p-5 bg-slate-50/50 dark:bg-slate-900/30 animate-fade-in">
                    <div className="flex items-center gap-2 mb-3">
                        <h4 className="text-[13px] font-black text-slate-700 dark:text-slate-300">
                            {format(new Date(selectedDate), 'M 月 d 日 EEEE', { locale: zhTW })}
                        </h4>
                        <span className="text-[11px] font-bold bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full">
                            {selectedEvents.length} 件事項
                        </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                        {selectedEvents.map((evt) => (
                            <TimelineEventBadge key={evt.id} event={evt} />
                        ))}
                    </div>
                </div>
            )}

            {/* 圖例 */}
            <div className="flex items-center gap-4 px-5 py-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 font-bold">
                <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm bg-indigo-500" /> 里程碑
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" /> 約客
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-0 h-0 border-l-4 border-r-4 border-b-[6px] border-l-transparent border-r-transparent border-b-rose-500" /> 截止日
                </div>
                <span className="text-slate-300 ml-auto">點擊日期查看詳情</span>
            </div>
        </div>
    );
}
