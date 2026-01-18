'use client';

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { DemoCase } from '@/types';
import { format, addDays, isSameDay, parseISO, startOfDay, eachDayOfInterval } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { createPortal } from 'react-dom';

interface TimelineGanttViewProps {
    cases: DemoCase[];
}

const MILESTONES = [
    { key: 'seal_date', label: '印', color: 'bg-indigo-500', icon: '印' },
    { key: 'tax_payment_date', label: '稅', color: 'bg-emerald-500', icon: '稅' },
    { key: 'transfer_date', label: '過', color: 'bg-purple-500', icon: '過' },
    { key: 'handover_date', label: '交', color: 'bg-red-500', icon: '交' },
];

const TAX_DEADLINES = [
    { key: 'land_value_tax_deadline', label: '限 (土增)', color: 'bg-rose-600', icon: '限' },
    { key: 'deed_tax_deadline', label: '限 (契)', color: 'bg-rose-600', icon: '限' },
    { key: 'land_tax_deadline', label: '限 (地)', color: 'bg-rose-600', icon: '限' },
    { key: 'house_tax_deadline', label: '限 (房)', color: 'bg-rose-600', icon: '限' },
];

const APPOINTMENTS = [
    { key: 'seal_appointment', name: '用印約定', label: '約', color: 'bg-indigo-100 text-indigo-700 border-indigo-300', icon: '🤝' },
    { key: 'tax_appointment', name: '完稅約定', label: '約', color: 'bg-emerald-100 text-emerald-700 border-emerald-300', icon: '🤝' },
    { key: 'handover_appointment', name: '交屋約定', label: '約', color: 'bg-red-100 text-red-700 border-red-300', icon: '🤝' },
];

export default function TimelineGanttView({ cases }: TimelineGanttViewProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showEmpty, setShowEmpty] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [hoveredMarker, setHoveredMarker] = useState<{
        content: string;
        time: string;
        date: string;
        caseNumber: string;
    } | null>(null);
    const today = useMemo(() => startOfDay(new Date()), []);
    const days = useMemo(() => {
        return eachDayOfInterval({
            start: today,
            end: addDays(today, 30),
        });
    }, [today]);


    const caseActivity = useMemo(() => {
        return cases
            .filter((c) => c.status === 'Processing')
            .map((c) => {
                const m = (c.milestones?.[0] || {}) as any;
                const f = (c.financials?.[0] || {}) as any;
                const activities: {
                    date: Date;
                    type: string;
                    color: string;
                    label: string;
                    content?: string;
                    shape: 'square' | 'circle' | 'pill';
                    isAppointment?: boolean;
                }[] = [];

                if (m) {
                    // 1. Milestones (Deadlines) -> Square
                    MILESTONES.forEach((milestone) => {
                        const dateStr = m[milestone.key as keyof typeof m];
                        if (dateStr && typeof dateStr === 'string') {
                            try {
                                const date = parseISO(dateStr);
                                activities.push({
                                    date,
                                    type: milestone.key,
                                    color: milestone.color,
                                    label: milestone.label,
                                    content: milestone.key,
                                    shape: 'square',
                                });
                            } catch (e) { }
                        }
                    });

                    // 2. Appointments (Meetings) -> Circle
                    APPOINTMENTS.forEach((appt) => {
                        const dateStr = m[appt.key as keyof typeof m];
                        if (dateStr && typeof dateStr === 'string') {
                            try {
                                const date = parseISO(dateStr);
                                activities.push({
                                    date,
                                    type: appt.key,
                                    color: appt.color,
                                    label: appt.icon,
                                    content: (appt as any).name,
                                    shape: 'circle',
                                    isAppointment: true,
                                });
                            } catch (e) { }
                        }
                    });
                }

                if (f) {
                    // 3. Tax Deadlines -> Square (Rose)
                    TAX_DEADLINES.forEach((tax) => {
                        const dateStr = f[tax.key];
                        if (dateStr && typeof dateStr === 'string') {
                            try {
                                const date = parseISO(dateStr);
                                activities.push({
                                    date,
                                    type: tax.key,
                                    color: tax.color,
                                    label: tax.icon,
                                    content: tax.label,
                                    shape: 'square',
                                });
                            } catch (e) { }
                        }
                    });
                }

                // 4. Todos List (Manual Memos) -> Pill/Tag
                if (c.todos_list) {
                    c.todos_list.forEach((todo) => {
                        if (todo.is_deleted || todo.is_completed || !todo.due_date) return;
                        if (todo.source_type === 'system') return; // Skip system reminders

                        try {
                            const date = parseISO(todo.due_date);
                            activities.push({
                                date,
                                type: 'memo',
                                color: 'bg-amber-100 text-amber-800 border-amber-300',
                                label: '📝',
                                content: todo.content,
                                shape: 'pill',
                            });
                        } catch (e) { }
                    });
                }

                // Group by day to prevent overlap - use counter approach
                const slotCounters: Record<string, number> = {};

                const keyedActivities = activities
                    .sort((a, b) => a.date.getTime() - b.date.getTime())
                    .map((act) => {
                        const dayKey = format(act.date, 'yyyy-MM-dd');
                        if (!slotCounters[dayKey]) {
                            slotCounters[dayKey] = 0;
                        }
                        const slot = slotCounters[dayKey];
                        slotCounters[dayKey]++;
                        return { ...act, slot };
                    });

                const maxSlots = Math.max(1, ...Object.values(slotCounters));

                return {
                    id: c.id,
                    caseNumber: c.case_number,
                    buyer: c.buyer_name,
                    activities: keyedActivities,
                    maxSlots,
                };
            })
            .filter((c) => showEmpty || c.activities.length > 0);
    }, [cases, showEmpty]);

    if (!showEmpty && caseActivity.length === 0) return null;

    return (
        <div className="bg-card glass-card border-none shadow-xl mb-8 overflow-hidden rounded-3xl animate-fade-in relative">
            <div
                className="bg-white/50 dark:bg-slate-900/50 p-5 flex justify-between items-center border-b border-gray-100 dark:border-slate-800 transition-colors select-none"
            >
                <div>
                    <div
                        className="flex items-center gap-4 cursor-pointer"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                    >
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                            <span className="text-xl">🗓️</span>
                        </div>
                        <div>
                            <h3 className="text-slate-900 dark:text-white font-black text-lg tracking-tight">
                                全景時程監控表 (Pipeline View)
                            </h3>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                                30 Days Outlook • Deadlines & Appointments
                            </p>
                        </div>
                    </div>
                </div>

                {/* Info Panel - In Header */}
                <div className="flex-1 max-w-md mx-4">
                    <div className="bg-purple-50 border border-purple-200 rounded-lg shadow-sm overflow-hidden h-[70px] flex flex-col">
                        <div className="bg-purple-100 px-3 py-1 border-b border-purple-200 flex-shrink-0">
                            <h3 className="text-[10px] font-black tracking-wide text-purple-900">📍 行程詳情</h3>
                        </div>

                        <div className="flex-1 px-3 py-2 flex items-center justify-center overflow-hidden">
                            {hoveredMarker ? (
                                <div className="w-full flex items-center gap-4">
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                        <span className="text-sm">🗓️</span>
                                        <span className="text-xs font-black text-slate-800 truncate max-w-[100px]">{hoveredMarker.content}</span>
                                    </div>

                                    <div className="flex items-center gap-3 text-[10px] flex-1">
                                        <div className="flex items-center gap-1">
                                            <span className="text-slate-500">日期</span>
                                            <span className="font-bold text-slate-800">{hoveredMarker.date}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-slate-500">時間</span>
                                            <span className="font-bold text-slate-800">{hoveredMarker.time}</span>
                                        </div>
                                        <div className="flex items-center gap-1 flex-1 min-w-0">
                                            <span className="text-slate-500 flex-shrink-0">案件</span>
                                            <span className="font-bold text-slate-800 truncate">{hoveredMarker.caseNumber}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-slate-400 text-xs">
                                    <p className="text-[10px]">👆 移到圖標查看詳情</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowEmpty(!showEmpty);
                        }}
                        className={`text-[10px] px-3 py-1 rounded-full font-black tracking-widest uppercase border transition-all ${showEmpty
                            ? 'bg-blue-50 text-blue-600 border-blue-200 shadow-sm'
                            : 'bg-transparent text-slate-400 border-transparent hover:bg-slate-100'
                            }`}
                        title={showEmpty ? "隱藏無行程的案件" : "顯示所有承辦中案件 (包含無行程)"}
                    >
                        {showEmpty ? 'SHOW ALL' : 'ACTIVE ONLY'}
                    </button>
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className={`text-[10px] px-3 py-1 rounded-full font-black tracking-widest uppercase transition-all ${isCollapsed
                            ? 'bg-slate-100 text-slate-400'
                            : 'bg-purple-50 text-purple-600 border border-purple-100'
                            }`}
                    >
                        {isCollapsed ? 'COLLAPSED' : 'EXPANDED'}
                    </button>
                </div>
            </div>

            {!isCollapsed && (
                <>
                    <div className="overflow-x-auto overflow-y-auto max-h-[700px] pb-4 scrollbar-hide" ref={scrollContainerRef} style={{ isolation: 'auto' }}>
                        <div className="min-w-[1200px] relative" style={{ isolation: 'isolate' }}>
                            {/* Header: Dates */}
                            <div className="flex sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 shadow-sm">
                                <div className="w-48 sticky left-0 z-30 bg-white dark:bg-slate-900 border-r border-gray-100 dark:border-slate-800 p-3 text-[10px] font-black text-slate-400 uppercase flex items-center justify-center tracking-widest">
                                    CASE / TIMELINE
                                </div>
                                {days.map((day, idx) => (
                                    <div
                                        key={idx}
                                        className={`
                                    w-10 flex-shrink-0 border-r border-gray-50 dark:border-slate-800 flex flex-col items-center py-2
                                    ${idx % 7 === 0 || idx % 7 === 6 ? 'bg-slate-50/50 dark:bg-slate-800/20' : ''}
                                    ${isSameDay(day, today) ? 'bg-blue-50/50 border-t-2 border-b-0 border-blue-500' : ''}
                                `}
                                    >
                                        <span className="text-[9px] font-black text-slate-400 uppercase">
                                            {format(day, 'E', { locale: zhTW })}
                                        </span>
                                        <span
                                            className={`text-[13px] font-black ${isSameDay(day, today) ? 'text-blue-600' : 'text-slate-700 dark:text-slate-300'}`}
                                        >
                                            {format(day, 'd')}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Rows: Cases */}
                            {caseActivity.map((c, cIdx) => (
                                <div
                                    key={c.id}
                                    className="flex border-b border-gray-50 dark:border-slate-800 hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors group relative overflow-visible"
                                >
                                    <div className="w-48 sticky left-0 z-10 bg-white dark:bg-slate-900 border-r border-gray-100 dark:border-slate-800 p-3 flex flex-col justify-center shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
                                        <div className="text-[13px] font-black text-slate-800 dark:text-slate-200 group-hover:text-blue-600 transition-colors truncate">
                                            {c.caseNumber}
                                        </div>
                                        <div className="text-[11px] font-bold text-slate-400 truncate">
                                            {c.buyer}
                                        </div>
                                    </div>

                                    <div className="flex relative items-center" style={{ height: `${Math.max(56, (c as any).maxSlots * 40 + 16)}px`, isolation: 'auto' }}>
                                        {/* Grid Lines Background */}
                                        {days.map((day, idx) => (
                                            <div
                                                key={idx}
                                                className={`
                                            w-10 h-full flex-shrink-0 border-r border-gray-50 dark:border-slate-800/50 
                                            ${idx % 7 === 0 || idx % 7 === 6 ? 'bg-slate-50/30' : ''}
                                            ${isSameDay(day, today) ? 'bg-blue-50/10' : ''}
                                        `}
                                            />
                                        ))}

                                        {/* Activity Markers */}
                                        {c.activities.map((act: any, aIdx) => {
                                            const dayOffset = Math.floor(
                                                (act.date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                                            );
                                            if (dayOffset < 0 || dayOffset > 30) return null;

                                            // Style based on Shape
                                            let shapeClass = 'rounded-md'; // Default Square (Milestone)
                                            if (act.shape === 'circle') shapeClass = 'rounded-full ring-2 ring-white dark:ring-slate-900 shadow-lg';
                                            if (act.shape === 'pill') shapeClass = 'rounded-full px-1.5 w-auto min-w-[24px]';

                                            return (() => {
                                                let tooltipTitle = act.content || act.label;
                                                let tooltipTime = format(act.date, 'HH:mm');
                                                let tooltipDate = format(act.date, 'MM/dd (E)', { locale: zhTW });

                                                // Customize based on type
                                                if (act.isAppointment) {
                                                    tooltipTitle = `${act.content || '約定'}`;
                                                } else if (act.type.includes('deadline')) {
                                                    tooltipTitle = `${act.content} 期限`;
                                                    tooltipTime = '當日截止';
                                                }

                                                return (
                                                    <div
                                                        key={aIdx}
                                                        className="absolute z-20 group/marker transition-all duration-300"
                                                        style={{
                                                            left: `${dayOffset * 40 + 4}px`,
                                                            top: `${act.slot * 40 + 8}px`
                                                        }}
                                                        onMouseEnter={() => {
                                                            setHoveredMarker({
                                                                content: tooltipTitle,
                                                                time: tooltipTime,
                                                                date: tooltipDate,
                                                                caseNumber: c.caseNumber
                                                            });
                                                        }}
                                                        onMouseLeave={() => {
                                                            setHoveredMarker(null);
                                                        }}
                                                    >
                                                        {/* The Marker Icon */}
                                                        <div
                                                            className={`
                                                                h-8 flex items-center justify-center font-bold text-[10px] transition-all duration-200 cursor-pointer shadow-sm
                                                                group-hover/marker:scale-110 group-hover/marker:shadow-lg
                                                                ${act.color}
                                                                ${shapeClass}
                                                                ${act.shape === 'square' ? 'w-8 text-white' : ''}
                                                                ${act.shape === 'circle' ? 'w-8' : ''}
                                                            `}
                                                        >
                                                            {act.label}
                                                        </div>
                                                    </div>
                                                );
                                            })();
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Legend - Updated */}
                    <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-800 flex flex-wrap gap-6 text-[10px] font-black uppercase text-slate-400">
                        <div className="flex items-center gap-2">
                            <span className="text-xs">圖例：</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-md bg-indigo-500 shadow-sm"></div>
                            <span>死線 (Deadline)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-indigo-100 border-2 border-indigo-300 flex items-center justify-center text-[8px]">🤝</div>
                            <span>約定 (Appt)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-md bg-amber-100 border border-amber-300 flex items-center justify-center">📝</div>
                            <span>備忘 (Memo)</span>
                        </div>

                        <div className="ml-auto flex items-center gap-2">
                            <div className="w-px h-4 bg-slate-300 mx-2"></div>
                            {MILESTONES.map((m) => (
                                <div key={m.key} className="flex items-center gap-1.5 opacity-70">
                                    <div className={`w-2 h-2 rounded-full ${m.color}`}></div>
                                    <span>{m.label.replace('日', '')}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
