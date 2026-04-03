'use client';

import React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { TimelineEvent } from './constants';

interface TimelineEventBadgeProps {
    event: TimelineEvent;
    compact?: boolean;
    showDate?: boolean;
}

/**
 * 共用事件標記 — 在月曆、甘特圖、今日焦點中統一使用
 */
export function TimelineEventBadge({ event, compact = false, showDate = false }: TimelineEventBadgeProps) {
    if (compact) {
        // 月曆格子內的迷你標記
        return (
            <div
                className={`
                    inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold
                    ${event.category === 'milestone' ? `${event.color} text-white` : ''}
                    ${event.category === 'appointment' ? `${event.color} ${event.textColor} border` : ''}
                    ${event.category === 'tax_deadline' ? 'bg-rose-100 text-rose-700 border border-rose-200' : ''}
                    ${event.category === 'todo' ? 'bg-amber-100 text-amber-700 border border-amber-200' : ''}
                `}
                title={`${event.caseNumber} ${event.buyerName} — ${event.label}`}
            >
                <span>{event.icon}</span>
                {!compact && <span>{event.label}</span>}
            </div>
        );
    }

    // 完整事件卡片
    return (
        <div className="flex items-start gap-3 p-3 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all group">
            {/* 圖標 */}
            <div
                className={`
                    shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold
                    ${event.category === 'milestone' ? `${event.color} text-white shadow-sm` : ''}
                    ${event.category === 'appointment' ? `${event.color} ${event.textColor}` : ''}
                    ${event.category === 'tax_deadline' ? 'bg-rose-100 text-rose-600' : ''}
                    ${event.category === 'todo' ? 'bg-amber-100 text-amber-600' : ''}
                `}
            >
                {event.icon}
            </div>

            {/* 內容 */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-[13px] font-black text-slate-800 dark:text-slate-200">
                        {event.label}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full
                        ${event.category === 'milestone' ? 'bg-slate-100 text-slate-500' : ''}
                        ${event.category === 'appointment' ? 'bg-indigo-50 text-indigo-500' : ''}
                        ${event.category === 'tax_deadline' ? 'bg-rose-50 text-rose-500' : ''}
                        ${event.category === 'todo' ? 'bg-amber-50 text-amber-500' : ''}
                    `}>
                        {event.category === 'milestone' && '里程碑'}
                        {event.category === 'appointment' && '約客'}
                        {event.category === 'tax_deadline' && '截止日'}
                        {event.category === 'todo' && '待辦'}
                    </span>
                    {showDate && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 ml-auto flex items-center gap-1">
                            📅 {format(event.date, 'MM/dd')}
                        </span>
                    )}
                </div>
                <Link
                    href={`/cases/${event.caseId}`}
                    className="text-[12px] font-bold text-blue-600 hover:text-blue-700 transition-colors"
                >
                    {event.caseNumber}
                </Link>
                <span className="text-[12px] text-slate-400 ml-1.5">
                    {event.buyerName}
                    <span className="mx-1 text-slate-300">/</span>
                    {event.sellerName}
                </span>
                {event.content && (
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2 whitespace-pre-line">
                        {event.content}
                    </p>
                )}
                {event.pendingTodos && event.pendingTodos.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-700/50">
                        {event.pendingTodos.map((item) => (
                            <span
                                key={item}
                                className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-400/10 text-red-600 border border-red-400/20"
                            >
                                {item}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
