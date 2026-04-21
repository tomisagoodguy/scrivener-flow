'use client';

import React from 'react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { TimelineEvent } from './constants';
import { TimelineEventBadge } from './TimelineEventBadge';

interface TodayFocusProps {
    events: TimelineEvent[];
    today: Date;
    upcomingAttentions?: TimelineEvent[];
    onCompleteTodo?: (todoId: string) => void;
}

/**
 * ① 今日焦點 — 今天 & 明天有什麼事
 */
export function TodayFocus({ events, today, upcomingAttentions = [], onCompleteTodo }: TodayFocusProps) {
    const todayKey = format(today, 'yyyy-MM-dd');
    const tomorrowKey = format(new Date(today.getTime() + 86400000), 'yyyy-MM-dd');

    const todayEvents = events.filter((e) => format(e.date, 'yyyy-MM-dd') === todayKey);
    const tomorrowEvents = events.filter((e) => format(e.date, 'yyyy-MM-dd') === tomorrowKey);

    // 逾期事件 (必須是未完成的才有警示)
    const overdueEvents = events.filter((e) => format(e.date, 'yyyy-MM-dd') < todayKey && !e.isCompleted);

    if (todayEvents.length === 0 && tomorrowEvents.length === 0 && overdueEvents.length === 0 && upcomingAttentions.length === 0) {
        return (
            <div className="glass-card p-6 text-center">
                <p className="text-3xl mb-2">☀️</p>
                <p className="text-[14px] font-bold text-slate-500">今明兩天沒有排定事項</p>
                <p className="text-[12px] text-slate-400 mt-1">安心處理其他業務</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* 逾期警示 */}
            {overdueEvents.length > 0 && (
                <div className="glass-card p-5 border-rose-200 dark:border-rose-800/40 bg-rose-50/50 dark:bg-rose-950/20">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">🚨</span>
                        <h3 className="text-[14px] font-black text-rose-600">
                            逾期未處理
                        </h3>
                        <span className="text-[12px] font-bold bg-rose-500/10 text-rose-600 px-2 py-0.5 rounded-full border border-rose-500/20">
                            {overdueEvents.length} 件
                        </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                        {overdueEvents.map((evt) => (
                            <TimelineEventBadge key={evt.id} event={evt} showDate onComplete={onCompleteTodo} />
                        ))}
                    </div>
                </div>
            )}

            {/* 近期注意事項推播 */}
            {upcomingAttentions.length > 0 && (
                <div className="glass-card p-5 border-amber-200 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-950/20">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">🔔</span>
                        <h3 className="text-[14px] font-black text-amber-700 dark:text-white!">
                            近期注意事項推播
                        </h3>
                        <span className="text-[12px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 dark:bg-amber-400/20 px-2 py-0.5 rounded-full border border-amber-500/20">
                            {upcomingAttentions.length} 件
                        </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                        {upcomingAttentions.map((evt) => (
                            <TimelineEventBadge key={evt.id} event={evt} showDate />
                        ))}
                    </div>
                </div>
            )}

            {/* 今天 */}
            <div className="glass-card p-5">
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">📌</span>
                    <h3 className="text-[14px] font-black text-slate-800 dark:text-slate-200">
                        今天
                    </h3>
                    <span className="text-[12px] text-slate-400 font-bold">
                        {format(today, 'M/d (EEEE)', { locale: zhTW })}
                    </span>
                    {todayEvents.length > 0 && (
                        <span className="text-[12px] font-bold bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full border border-blue-500/20">
                            {todayEvents.length} 件
                        </span>
                    )}
                </div>
                {todayEvents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                        {todayEvents.map((evt) => (
                            <TimelineEventBadge key={evt.id} event={evt} />
                        ))}
                    </div>
                ) : (
                    <p className="text-[13px] text-slate-400 italic">今天沒有排定事項</p>
                )}
            </div>

            {/* 明天 */}
            <div className="glass-card p-5">
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">📅</span>
                    <h3 className="text-[14px] font-black text-slate-800 dark:text-slate-200">
                        明天
                    </h3>
                    <span className="text-[12px] text-slate-400 font-bold">
                        {format(new Date(today.getTime() + 86400000), 'M/d (EEEE)', { locale: zhTW })}
                    </span>
                    {tomorrowEvents.length > 0 && (
                        <span className="text-[12px] font-bold bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            {tomorrowEvents.length} 件
                        </span>
                    )}
                </div>
                {tomorrowEvents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                        {tomorrowEvents.map((evt) => (
                            <TimelineEventBadge key={evt.id} event={evt} />
                        ))}
                    </div>
                ) : (
                    <p className="text-[13px] text-slate-400 italic">明天沒有排定事項</p>
                )}
            </div>
        </div>
    );
}
