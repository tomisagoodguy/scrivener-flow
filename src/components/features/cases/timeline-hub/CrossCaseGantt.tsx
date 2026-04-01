'use client';

import React, { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
    format,
    eachDayOfInterval,
    addDays,
    isSameDay,
    isWeekend,
} from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { TimelineEvent, EventCategory, EVENT_CATEGORIES } from './constants';

interface CrossCaseGanttProps {
    caseTimelines: {
        caseId: string;
        caseNumber: string;
        buyerName: string;
        events: TimelineEvent[];
    }[];
    today: Date;
}

const SHAPE_MAP: Record<EventCategory, (color: string) => React.ReactNode> = {
    milestone: (color) => (
        <div className={`w-4 h-4 rounded-sm ${color} shadow-sm`} />
    ),
    appointment: (color) => (
        <div className={`w-4 h-4 rounded-full ${color} border-2`} />
    ),
    tax_deadline: (_color) => (
        <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-10 border-l-transparent border-r-transparent border-b-rose-500" />
    ),
    todo: () => (
        <div className="w-4 h-3 rounded-full bg-amber-400 border border-amber-500" />
    ),
};

/**
 * ③ 跨案件甘特圖 — 橫軸日期、縱軸案件
 */
export function CrossCaseGantt({ caseTimelines, today }: CrossCaseGanttProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [daysRange, setDaysRange] = useState(30);
    const [filterCategory, setFilterCategory] = useState<EventCategory | 'all'>('all');
    const [hoveredEvent, setHoveredEvent] = useState<TimelineEvent | null>(null);

    // 日期軸
    const days = useMemo(
        () => eachDayOfInterval({ start: today, end: addDays(today, daysRange - 1) }),
        [today, daysRange]
    );

    // 篩選後的資料
    const filteredTimelines = useMemo(() => {
        if (filterCategory === 'all') return caseTimelines;
        return caseTimelines
            .map((ct) => ({
                ...ct,
                events: ct.events.filter((e) => e.category === filterCategory),
            }))
            .filter((ct) => ct.events.length > 0);
    }, [caseTimelines, filterCategory]);

    if (caseTimelines.length === 0) {
        return (
            <div className="glass-card p-8 text-center">
                <p className="text-2xl mb-2">📊</p>
                <p className="text-[14px] font-bold text-slate-400">沒有可顯示的時程資料</p>
            </div>
        );
    }

    const COL_WIDTH = 48; // px per day
    const LABEL_WIDTH = 140; // px case label col

    return (
        <div className="glass-card overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-5 pb-3">
                <div className="flex items-center gap-3">
                    <span className="text-lg">📊</span>
                    <h3 className="text-[15px] font-black text-slate-800 dark:text-slate-200">
                        跨案件時間軸
                    </h3>
                    <span className="text-[11px] font-bold bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full text-slate-500">
                        {filteredTimelines.length} 案件
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {/* 類型篩選 */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        <button
                            onClick={() => setFilterCategory('all')}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${
                                filterCategory === 'all'
                                    ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                                    : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            全部
                        </button>
                        {EVENT_CATEGORIES.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setFilterCategory(cat.id)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${
                                    filterCategory === cat.id
                                        ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                                        : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                {cat.icon} {cat.label}
                            </button>
                        ))}
                    </div>
                    {/* 天數切換 */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        {[14, 30, 60].map((d) => (
                            <button
                                key={d}
                                onClick={() => setDaysRange(d)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${
                                    daysRange === d
                                        ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                                        : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                {d}天
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tooltip */}
            {hoveredEvent && (
                <div className="mx-5 mb-2 p-3 rounded-xl bg-slate-800 text-white text-[12px] font-bold animate-fade-in shadow-lg">
                    <span className="mr-2">{hoveredEvent.icon}</span>
                    <span className="text-blue-300">{hoveredEvent.caseNumber}</span>
                    <span className="mx-1.5 text-slate-500">|</span>
                    <span>{hoveredEvent.buyerName}</span>
                    <span className="mx-1.5 text-slate-500">|</span>
                    <span className="text-yellow-300">{hoveredEvent.label}</span>
                    <span className="mx-1.5 text-slate-500">|</span>
                    <span className="text-slate-400">{format(hoveredEvent.date, 'M/d (EEE)', { locale: zhTW })}</span>
                    {hoveredEvent.content && (
                        <span className="ml-2 text-slate-300">— {hoveredEvent.content}</span>
                    )}
                </div>
            )}

            {/* Grid */}
            <div ref={scrollRef} className="overflow-x-auto px-5 pb-4">
                <div style={{ width: LABEL_WIDTH + days.length * COL_WIDTH }}>
                    {/* Date Header */}
                    <div className="flex sticky top-0 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm" style={{ height: 40 }}>
                        <div
                            className="shrink-0 flex items-center text-[10px] font-black text-slate-400 uppercase tracking-wider pl-2 border-b border-slate-100 dark:border-slate-800"
                            style={{ width: LABEL_WIDTH }}
                        >
                            案件
                        </div>
                        {days.map((day) => {
                            const isToday = isSameDay(day, today);
                            const isWknd = isWeekend(day);
                            return (
                                <div
                                    key={format(day, 'yyyy-MM-dd')}
                                    className={`shrink-0 flex flex-col items-center justify-center border-b text-[9px] font-bold
                                        ${isToday ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 text-blue-600' : ''}
                                        ${isWknd && !isToday ? 'bg-slate-50/50 dark:bg-slate-900/50 border-slate-100 text-slate-300' : ''}
                                        ${!isToday && !isWknd ? 'border-slate-100 dark:border-slate-800 text-slate-400' : ''}
                                    `}
                                    style={{ width: COL_WIDTH }}
                                >
                                    <span className="leading-none">{format(day, 'EEE', { locale: zhTW })}</span>
                                    <span className={`leading-none ${isToday ? 'font-black text-[11px]' : ''}`}>
                                        {format(day, 'M/d')}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Case Rows */}
                    {filteredTimelines.map((ct) => (
                        <div key={ct.caseId} className="flex group/row hover:bg-blue-50/30 dark:hover:bg-blue-950/10 transition-colors" style={{ height: 36 }}>
                            {/* Case Label */}
                            <Link
                                href={`/cases/${ct.caseId}`}
                                className="shrink-0 flex items-center gap-1.5 pl-2 pr-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 transition-colors border-b border-slate-50 dark:border-slate-800/50 truncate"
                                style={{ width: LABEL_WIDTH }}
                            >
                                <span className="truncate">{ct.caseNumber}</span>
                                <span className="text-[10px] text-slate-400 truncate hidden xl:inline">{ct.buyerName}</span>
                            </Link>
                            {/* Day Cells */}
                            {days.map((day) => {
                                const dayKey = format(day, 'yyyy-MM-dd');
                                const isToday = isSameDay(day, today);
                                const isWknd = isWeekend(day);
                                const dayEvts = ct.events.filter((e) => format(e.date, 'yyyy-MM-dd') === dayKey);

                                return (
                                    <div
                                        key={dayKey}
                                        className={`shrink-0 flex items-center justify-center gap-0.5 border-b
                                            ${isToday ? 'bg-blue-50/50 dark:bg-blue-950/10 border-blue-100' : ''}
                                            ${isWknd && !isToday ? 'bg-slate-50/30 dark:bg-slate-900/20 border-slate-50' : ''}
                                            ${!isToday && !isWknd ? 'border-slate-50 dark:border-slate-800/30' : ''}
                                        `}
                                        style={{ width: COL_WIDTH }}
                                    >
                                        {dayEvts.map((evt) => (
                                            <div
                                                key={evt.id}
                                                onMouseEnter={() => setHoveredEvent(evt)}
                                                onMouseLeave={() => setHoveredEvent(null)}
                                                className="cursor-pointer hover:scale-125 transition-transform"
                                                title={`${evt.label} — ${evt.buyerName}`}
                                            >
                                                {SHAPE_MAP[evt.category](evt.color)}
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-5 px-5 py-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 font-bold">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-indigo-500" /> 里程碑
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-emerald-100 border-2 border-emerald-400" /> 約客
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-0 h-0 border-l-4 border-r-4 border-b-[7px] border-l-transparent border-r-transparent border-b-rose-500" /> 截止日
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-2.5 rounded-full bg-amber-400 border border-amber-500" /> 待辦
                </div>
                <span className="text-slate-300 ml-auto">hover 標記查看詳情</span>
            </div>
        </div>
    );
}
