'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DemoCase, TodoRecord } from '@/types';
import { useTimelineHub } from './useTimelineHub';
import { TodayFocus } from './TodayFocus';
import { DailyList } from './DailyList';

interface TimelineHubProps {
    cases: DemoCase[];
}

/**
 * 時程總覽 — 主容器
 * 三段式：① 今日焦點 → ② 月曆格 → ③ 跨案件甘特圖
 *
 * todos_list 直接從 browser client 抓，繞過 Server Component prop 的 Router Cache，
 * 確保「主頁面標記完成」後切換到 Timeline 時即時反映。
 */
export default function TimelineHub({ cases }: TimelineHubProps) {
    const supabase = useMemo(() => createClient(), []);
    // 用 server prop 的 todos_list 初始化，避免 hydration 閃爍
    const [clientTodos, setClientTodos] = useState<TodoRecord[]>(() =>
        cases.flatMap((c) => c.todos_list || [])
    );

    // Mount 時立即抓最新 todos（繞過 Router Cache）
    // 並訂閱 Realtime，兩頁面同時開著時也能即時同步
    useEffect(() => {
        const fetchTodos = async () => {
            const { data } = await supabase
                .from('todos')
                .select('*')
                .eq('is_deleted', false);
            if (data) setClientTodos(data as TodoRecord[]);
        };

        fetchTodos();

        const channel = supabase
            .channel('timeline-todos-live')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'todos' }, fetchTodos)
            .subscribe();

        window.addEventListener('todo-updated', fetchTodos);

        return () => {
            supabase.removeChannel(channel);
            window.removeEventListener('todo-updated', fetchTodos);
        };
    }, [supabase]);

    // 把 client-side 最新 todos 合併回 cases prop
    const mergedCases = useMemo<DemoCase[]>(() => {
        return cases.map((c) => ({
            ...c,
            todos_list: clientTodos.filter((t) => t.case_id === c.id),
        }));
    }, [cases, clientTodos]);

    const { today, allEvents, dayGroups, stats, upcomingAttentions } = useTimelineHub(mergedCases);

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

            {/* ② 每日列表 */}
            <DailyList dayGroups={dayGroups} today={today} />
        </div>
    );
}
