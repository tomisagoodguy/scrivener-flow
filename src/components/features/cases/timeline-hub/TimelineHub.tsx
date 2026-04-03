'use client';

import React from 'react';
import { DemoCase } from '@/types';
import { useTimelineHub } from './useTimelineHub';
import { TodayFocus } from './TodayFocus';
import { MonthCalendar } from './MonthCalendar';
import { DailyList } from './DailyList';

interface TimelineHubProps {
    cases: DemoCase[];
}

/**
 * 時程總覽 — 主容器
 * 三段式：① 今日焦點 → ② 月曆格 → ③ 跨案件甘特圖
 */
export default function TimelineHub({ cases }: TimelineHubProps) {
    const { today, allEvents, dayGroups, stats, upcomingAttentions } = useTimelineHub(cases);

    return (
        <div className="space-y-6">
            {/* 頂部統計 */}
            <div className="flex items-center gap-3 text-sm flex-wrap">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                    {stats.totalCases} 件承辦中
                </span>
                {stats.todayCount > 0 && (
                    <span className="font-bold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 text-xs">
                        📌 今日 {stats.todayCount} 件
                    </span>
                )}
                {stats.weekCount > 0 && (
                    <span className="font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 text-xs">
                        📅 本週 {stats.weekCount} 件
                    </span>
                )}
                {stats.overdueCount > 0 && (
                    <span className="font-bold text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20 text-xs">
                        🚨 逾期 {stats.overdueCount} 件
                    </span>
                )}
            </div>

            {/* ① 今日焦點 */}
            <TodayFocus events={allEvents} today={today} upcomingAttentions={upcomingAttentions} />

            {/* ② 月曆格 */}
            <MonthCalendar events={allEvents} today={today} />

            {/* ③ 每日列表 */}
            <DailyList dayGroups={dayGroups} today={today} />
        </div>
    );
}
