'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { format, isToday, isTomorrow, differenceInDays } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { DayGroup, EventCategory, EVENT_CATEGORIES } from './constants';

interface DailyListProps {
    dayGroups: DayGroup[];
    today: Date;
}

const CATEGORY_LABEL: Record<EventCategory, string> = {
    milestone: '里程碑',
    appointment: '約客',
    tax_deadline: '截止',
    todo: '待辦',
};

function dayHeader(date: Date, today: Date): string {
    if (isToday(date)) return `今天　${format(date, 'M/d EEEE', { locale: zhTW })}`;
    if (isTomorrow(date)) return `明天　${format(date, 'M/d EEEE', { locale: zhTW })}`;
    const diff = differenceInDays(date, today);
    const rel = diff <= 7 ? `${diff}天後　` : '';
    return `${rel}${format(date, 'M/d EEEE', { locale: zhTW })}`;
}

/**
 * ③ 每日列表 — 純文字行列，資訊密度最大化
 */
export function DailyList({ dayGroups, today }: DailyListProps) {
    const [activeFilter, setActiveFilter] = useState<EventCategory | 'all'>('all');

    const filteredGroups = dayGroups
        .filter((g) => g.isToday || g.date >= today)
        .map((g) => ({
            ...g,
            events: activeFilter === 'all' ? g.events : g.events.filter((e) => e.category === activeFilter),
        }))
        .filter((g) => g.events.length > 0);

    return (
        <div className="glass-card">
            {/* Header + Filter 同行 */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex-wrap">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300 shrink-0">每日時程</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                    {(['all', ...EVENT_CATEGORIES.map(c => c.id)] as const).map((id) => {
                        const label = id === 'all' ? '全部' : CATEGORY_LABEL[id as EventCategory];
                        return (
                            <button
                                key={id}
                                onClick={() => setActiveFilter(id)}
                                className={`text-xs px-2 py-0.5 rounded transition-colors ${
                                    activeFilter === id
                                        ? 'bg-slate-700 text-white dark:bg-slate-300 dark:text-slate-900'
                                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                }`}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 列表 */}
            {filteredGroups.length === 0 ? (
                <p className="px-4 py-6 text-sm text-slate-400 text-center">沒有符合的事項</p>
            ) : (
                filteredGroups.map((group) => (
                    <div key={group.dateKey}>
                        {/* 日期列 */}
                        <div className={`px-4 py-1.5 text-xs font-bold border-b border-slate-100 dark:border-slate-800 ${
                            group.isToday
                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                : 'bg-slate-50 dark:bg-slate-800/50 text-slate-500'
                        }`}>
                            {dayHeader(group.date, today)}
                            <span className="ml-2 font-normal opacity-60">{group.events.length} 件</span>
                        </div>

                        {/* 事件行 */}
                        {group.events.map((evt) => (
                            <div
                                key={evt.id}
                                className="flex items-baseline gap-2 px-4 py-1.5 border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/30 text-sm"
                            >
                                <span className="shrink-0 w-4 text-center">{evt.icon}</span>
                                <span className="shrink-0 w-14 text-xs text-slate-500">{evt.label}</span>
                                <Link
                                    href={`/cases/${evt.caseId}`}
                                    className="shrink-0 text-xs font-bold text-blue-600 hover:underline"
                                >
                                    {evt.caseNumber}
                                </Link>
                                <span className="text-xs text-slate-600 dark:text-slate-300 shrink-0">
                                    {evt.buyerName}
                                    <span className="text-slate-300 dark:text-slate-600 mx-1">/</span>
                                    {evt.sellerName}
                                </span>
                                {evt.content && (
                                    <span className="text-xs text-slate-400 truncate">{evt.content}</span>
                                )}
                            </div>
                        ))}
                    </div>
                ))
            )}
        </div>
    );
}
