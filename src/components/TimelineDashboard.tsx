'use client';

import React, { useMemo } from 'react';
import { DemoCase } from '@/types';
import { format, addDays, isSameDay, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { zhTW } from 'date-fns/locale';

interface TimelineDashboardProps {
    cases: DemoCase[];
}

interface TimelineItem {
    date: Date;
    caseNumber: string;
    buyer: string;
    seller: string;
    type: '代償' | '用印' | '完稅' | '過戶' | '交屋' | '尾款';
    color: string;
    caseId: string;
}

const TASK_CONFIG = {
    '代償': { color: 'bg-orange-500', icon: '🏦' },
    '用印': { color: 'bg-blue-500', icon: '✍️' },
    '完稅': { color: 'bg-emerald-500', icon: '🧾' },
    '過戶': { color: 'bg-purple-500', icon: '🏢' },
    '交屋': { color: 'bg-indigo-600', icon: '🔑' },
    '尾款': { color: 'bg-amber-500', icon: '💰' },
};

export default function TimelineDashboard({ cases }: TimelineDashboardProps) {
    const today = startOfDay(new Date());
    const sevenDaysLater = endOfDay(addDays(today, 7));

    const upcomingTasks = useMemo(() => {
        const tasks: TimelineItem[] = [];

        cases.forEach((c) => {
            const m = Array.isArray(c.milestones) ? c.milestones[0] : c.milestones;
            if (!m) return;

            const checkAndAdd = (dateStr: string | undefined, type: TimelineItem['type']) => {
                if (!dateStr) return;
                try {
                    const date = parseISO(dateStr);
                    if (isWithinInterval(date, { start: today, end: sevenDaysLater })) {
                        tasks.push({
                            date,
                            caseNumber: c.case_number,
                            buyer: c.buyer_name,
                            seller: c.seller_name,
                            type,
                            color: TASK_CONFIG[type].color,
                            caseId: c.id
                        });
                    }
                } catch (e) {
                    console.error('Invalid date:', dateStr);
                }
            };

            checkAndAdd(m.redemption_date, '代償');
            checkAndAdd(m.seal_date, '用印');
            checkAndAdd(m.tax_payment_date, '完稅');
            checkAndAdd(m.transfer_date, '過戶');
            checkAndAdd(m.handover_date, '交屋');
            checkAndAdd(m.balance_payment_date, '尾款');
        });

        return tasks.sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [cases, today, sevenDaysLater]);

    // Group by date
    const days = useMemo(() => {
        const result = [];
        for (let i = 0; i <= 7; i++) {
            const date = addDays(today, i);
            const dayTasks = upcomingTasks.filter(t => isSameDay(t.date, date));
            result.push({
                date,
                tasks: dayTasks,
                isToday: i === 0
            });
        }
        return result;
    }, [upcomingTasks, today]);

    if (upcomingTasks.length === 0) {
        return (
            <div className="bg-secondary/20 border border-dashed border-border-color rounded-xl p-6 text-center mb-8">
                <p className="text-foreground/40 text-sm">未來 7 天暫無重要排程</p>
            </div>
        );
    }

    return (
        <div className="mb-8 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>
                    7 日工作預警看板
                </h3>
                <span className="text-xs text-foreground/40">
                    {format(today, 'yyyy/MM/dd')} - {format(addDays(today, 7), 'yyyy/MM/dd')}
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-3 h-full">
                {days.map((day, idx) => (
                    <div
                        key={idx}
                        className={`
                            flex flex-col rounded-xl border-2 transition-all h-full min-h-[160px]
                            ${day.isToday ? 'bg-primary/20 dark:bg-primary/30 border-primary ring-2 ring-primary/20' : 'bg-card border-border-color'}
                            ${day.tasks.length === 0 ? 'opacity-90' : 'opacity-100 shadow-md'}
                        `}
                    >
                        {/* Day Header */}
                        <div className={`
                            px-3 py-3 border-b-2 text-center
                            ${day.isToday ? 'border-primary/30 bg-primary/20 dark:bg-primary/40' : 'border-border-color bg-secondary/50'}
                        `}>
                            <div className={`text-[13px] uppercase font-black tracking-tighter mb-1 ${day.isToday ? 'text-primary' : 'text-foreground/80'}`}>
                                {day.isToday ? '今日 TODAY' : format(day.date, 'EEEE', { locale: zhTW })}
                            </div>
                            <div className={`text-2xl font-black leading-none ${day.isToday ? 'text-primary' : 'text-foreground'}`}>
                                {format(day.date, 'd')}
                            </div>
                        </div>

                        {/* Tasks List */}
                        <div className="p-2 space-y-2 flex-grow overflow-y-auto max-h-[250px] custom-scrollbar bg-white/50">
                            {day.tasks.length > 0 ? (
                                day.tasks.map((task, tIdx) => (
                                    <div
                                        key={tIdx}
                                        className={`${task.color} text-white p-2.5 rounded-lg text-[13px] shadow-sm hover:scale-[1.02] transition-transform cursor-pointer relative group overflow-hidden border border-black/10`}
                                        title={`${task.caseNumber} - ${task.buyer} vs ${task.seller}`}
                                    >
                                        <div className="absolute top-0 right-0 p-1 opacity-20 pointer-events-none text-xl">
                                            {TASK_CONFIG[task.type].icon}
                                        </div>
                                        <div className="font-black flex items-center justify-between mb-1.5 border-b border-white/20 pb-1">
                                            <span>{task.type}</span>
                                            <span className="text-[10px] bg-black/40 px-1.5 py-0.5 rounded truncate ml-1">{task.caseNumber}</span>
                                        </div>
                                        <div className="truncate font-bold">
                                            {task.buyer} <span className="mx-0.5">⇄</span> {task.seller}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="h-full flex items-center justify-center py-4 text-center">
                                    <span className="text-[11px] text-foreground/30 font-bold italic underline decoration-foreground/10">無排程</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
                .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); }
            `}</style>
        </div>
    );
}
