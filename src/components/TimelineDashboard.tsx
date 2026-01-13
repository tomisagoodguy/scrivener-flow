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
    type: string;
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
    '簽約': { color: 'bg-slate-500', icon: '📝' }, // Added Contract phase
};

const TODO_DATE_MAP: Record<string, keyof import('@/types').Milestone> = {
    '買方蓋印章': 'seal_date',
    '賣方蓋印章': 'seal_date',
    '用印款': 'seal_date',
    '權狀印鑑': 'seal_date',
    '完稅款': 'tax_payment_date',
    '稅單': 'tax_payment_date',
    '打單': 'tax_payment_date',
    '稅費分算': 'handover_date', // Adjusted to Handover based on typical flow
    '過戶': 'transfer_date',
    '整過戶': 'transfer_date',
    '實登': 'transfer_date',
    '規費': 'transfer_date',
    '設定': 'transfer_date',
    '保單': 'transfer_date',
    '塗銷': 'transfer_date',
    '代償': 'redemption_date',
    '二撥': 'balance_payment_date',
    '差額': 'balance_payment_date',
    '履保': 'contract_date',
    '授權': 'contract_date',
    '解約排除': 'contract_date',
    '水電': 'handover_date',
    '整交屋': 'handover_date',
};

// Map specific todos to their "Parent Phase" for color/icon inheritance
const TODO_PHASE_MAP: Record<string, string> = {
    '買方蓋印章': '用印',
    '賣方蓋印章': '用印',
    '用印款': '用印',
    '權狀印鑑': '用印',
    '完稅款': '完稅',
    '稅單': '完稅',
    '打單': '完稅',
    '稅費分算': '交屋',
    '整過戶': '過戶',
    '實登': '過戶',
    '規費': '過戶',
    '設定': '過戶',
    '保單': '過戶',
    '塗銷': '過戶',
    '代償': '代償',
    '二撥': '尾款',
    '差額': '尾款',
    '履保': '簽約',
    '授權': '簽約',
    '解約排除': '簽約',
    '水電': '交屋',
    '整交屋': '交屋',
};

export default function TimelineDashboard({ cases }: TimelineDashboardProps) {
    const today = startOfDay(new Date());
    const sevenDaysLater = endOfDay(addDays(today, 7));

    const { upcomingTasks } = useMemo(() => {
        const upcoming: TimelineItem[] = [];

        cases.forEach((c) => {
            const m = Array.isArray(c.milestones) ? c.milestones[0] : c.milestones;
            if (!m) return;

            const checkAndAdd = (dateStr: string | undefined, type: string) => {
                if (!dateStr) return;
                try {
                    const date = parseISO(dateStr);
                    // Standard Check: Is it within today (00:00) -> 7 days later
                    if (isWithinInterval(date, { start: today, end: sevenDaysLater })) {
                        // Determine Phase (either it IS a phase, or it maps to one)
                        const phase = TODO_PHASE_MAP[type] || type;
                        const config = TASK_CONFIG[phase as keyof typeof TASK_CONFIG];

                        // Default to Yellow if really unknown, but now most should map.
                        const color = config ? config.color : 'bg-yellow-500 border border-yellow-600';

                        upcoming.push({
                            date,
                            caseNumber: c.case_number,
                            buyer: c.buyer_name,
                            seller: c.seller_name,
                            type,
                            color,
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

            // Check Todos (Uncompleted)
            if (c.todos) {
                Object.entries(c.todos).forEach(([todoName, isDone]) => {
                    if (isDone) return;
                    const mapKey = TODO_DATE_MAP[todoName];
                    if (mapKey && m[mapKey]) {
                        checkAndAdd(m[mapKey] as string, todoName);
                    }
                });
            }
        });

        return {
            upcomingTasks: upcoming.sort((a, b) => a.date.getTime() - b.date.getTime()),
        };
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

    return (
        <div className="mb-8 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-black flex items-center gap-3">
                    <span className="flex h-3 w-3 rounded-full bg-primary animate-pulse shadow-lg"></span>
                    7 日工作預警看板 (Work Dashboard)
                </h3>
                <div className="flex gap-4 text-xs font-bold text-foreground/50">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary"></span> 今日任務</span>
                    <span>{format(today, 'yyyy/MM/dd')} - {format(addDays(today, 7), 'MM/dd')}</span>
                </div>
            </div>

            <div className="flex gap-3 h-full overflow-x-hidden p-1 min-h-[300px]">
                {/* 7 Days Columns - Flex Expandable */}
                {days.map((day, idx) => (
                    <div
                        key={idx}
                        className={`
                            flex-1 min-w-[80px] flex flex-col rounded-xl border-2 transition-all duration-300 ease-in-out h-full
                            hover:flex-[4] hover:min-w-[280px] hover:shadow-xl hover:z-10 hover:-translate-y-1
                            group
                            ${day.isToday ? 'bg-primary/5 border-primary/50 ring-4 ring-primary/5 z-0' : 'bg-card border-border-color'}
                        `}
                    >
                        {/* Day Header */}
                        <div className={`
                            px-2 py-3 border-b-2 text-center shrink-0 transition-colors
                            ${day.isToday ? 'border-primary/30 bg-primary/10' : 'border-border-color bg-secondary/30 group-hover:bg-white/80'}
                        `}>
                            <div className={`text-[10px] uppercase font-black tracking-tighter mb-1 truncate ${day.isToday ? 'text-primary' : 'text-foreground/40'}`}>
                                {day.isToday ? '今日 TODAY' : format(day.date, 'ccc', { locale: zhTW })}
                            </div>
                            <div className={`text-xl font-black leading-none group-hover:text-3xl transition-all ${day.isToday ? 'text-primary' : 'text-foreground'}`}>
                                {format(day.date, 'd')}
                            </div>
                            <div className="h-0 opacity-0 group-hover:h-auto group-hover:opacity-100 overflow-hidden transition-all text-[10px] text-foreground/40 mt-1">
                                {format(day.date, 'yyyy/MM')}
                            </div>
                        </div>

                        {/* Tasks List */}
                        <div className="p-1.5 space-y-1.5 flex-grow overflow-y-auto custom-scrollbar bg-white/30 group-hover:p-3 group-hover:space-y-3 transition-all">
                            {day.tasks.length > 0 ? (
                                day.tasks.map((task, tIdx) => (
                                    <TaskCard key={tIdx} task={task} />
                                ))
                            ) : (
                                <div className="h-full flex items-center justify-center text-center opacity-50 group-hover:opacity-100 transition-opacity">
                                    <span className="text-[10px] text-foreground/20 font-bold border-b-2 border-dotted border-foreground/10 pb-0.5 whitespace-nowrap group-hover:text-sm">無排程</span>
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

function TaskCard({ task, isOverdue = false }: { task: TimelineItem, isOverdue?: boolean }) {
    return (
        <div
            className={`
                shrink-0
                text-white p-2 rounded-md shadow-sm transition-all cursor-pointer relative overflow-hidden border border-white/20 select-none
                group-hover:rounded-lg group-hover:p-3 group-hover:shadow-md
                ${isOverdue ? 'bg-rose-500 hover:bg-rose-600' : `${task.color} hover:brightness-110`}
            `}
            title={`${task.caseNumber} - ${task.buyer} vs ${task.seller}`}
        >
            {/* Compact View (Default) */}
            <div className="flex flex-col gap-0.5 group-hover:hidden">
                <div className="flex justify-between items-center">
                    <span className="font-black text-[11px] opacity-90">{task.type}</span>
                    <span className="text-[9px] bg-black/20 px-1 rounded opacity-80">{task.caseNumber}</span>
                </div>
            </div>

            {/* Expanded View (On Column Hover) */}
            <div className="hidden group-hover:flex flex-col gap-1 animate-fade-in">
                <div className="flex justify-between items-start border-b border-white/20 pb-1 mb-1">
                    <span className="font-black text-sm flex items-center gap-1">
                        {
                            TASK_CONFIG[(TODO_PHASE_MAP[task.type] || task.type) as keyof typeof TASK_CONFIG]?.icon || '⚠️'
                        } {task.type}
                    </span>
                    <span className="text-[10px] font-mono bg-black/20 px-1.5 py-0.5 rounded text-white/90">{task.caseNumber}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold text-white/95">
                    <span className="truncate max-w-[45%]">{task.buyer}</span>
                    <span className="text-[10px] opacity-60">⇄</span>
                    <span className="truncate max-w-[45%] text-right">{task.seller}</span>
                </div>
                {isOverdue && (
                    <div className="mt-1 text-[10px] bg-white/20 text-center rounded py-0.5 text-white/90 font-bold">
                        預定日期: {format(task.date, 'yyyy/MM/dd')}
                    </div>
                )}
            </div>
        </div>
    );
}
