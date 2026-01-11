'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import { DemoCase } from '@/types';
import { format, addDays, isSameDay, parseISO, startOfDay, eachDayOfInterval } from 'date-fns';
import { zhTW } from 'date-fns/locale';

interface TimelineGanttViewProps {
    cases: DemoCase[];
}

const MILESTONES = [
    { key: 'contract_date', label: '簽', color: 'bg-blue-500', icon: '✍️' },
    { key: 'seal_date', label: '印', color: 'bg-indigo-500', icon: '印' },
    { key: 'tax_payment_date', label: '稅', color: 'bg-emerald-500', icon: '稅' },
    { key: 'balance_payment_date', label: '尾', color: 'bg-amber-500', icon: '尾' },
    { key: 'transfer_date', label: '過', color: 'bg-purple-500', icon: '過' },
    { key: 'handover_date', label: '交', color: 'bg-red-500', icon: '交' },
];

export default function TimelineGanttView({ cases }: TimelineGanttViewProps) {
    const today = startOfDay(new Date());
    const days = useMemo(() => {
        return eachDayOfInterval({
            start: today,
            end: addDays(today, 30)
        });
    }, [today]);

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Initial scroll to center today (though today is start)
    useEffect(() => {
        if (scrollContainerRef.current) {
            // No scroll needed as start is today, but for long views it would be useful
        }
    }, []);

    const caseActivity = useMemo(() => {
        return cases.filter(c => c.status === 'Processing').map(c => {
            const m = Array.isArray(c.milestones) ? c.milestones[0] : c.milestones;
            const activities: { date: Date, type: string, color: string, label: string }[] = [];

            if (m) {
                MILESTONES.forEach(milestone => {
                    const dateStr = m[milestone.key as keyof typeof m];
                    if (dateStr && typeof dateStr === 'string') {
                        try {
                            const date = parseISO(dateStr);
                            activities.push({
                                date,
                                type: milestone.key,
                                color: milestone.color,
                                label: milestone.label
                            });
                        } catch (e) { }
                    }
                });
            }

            return {
                id: c.id,
                caseNumber: c.case_number,
                buyer: c.buyer_name,
                activities
            };
        }).filter(c => c.activities.length > 0);
    }, [cases]);

    if (caseActivity.length === 0) return null;

    return (
        <div className="bg-white border-2 border-slate-300 shadow-sm mb-8 overflow-hidden">
            <div className="bg-slate-800 p-3 flex justify-between items-center">
                <h3 className="text-white font-black flex items-center gap-2">
                    <span className="text-xl">📅</span> 30 日進度甘特圖 (Gantt Monitoring)
                </h3>
                <span className="text-[10px] text-slate-400 font-bold uppercase underline">僅顯示案量：{caseActivity.length} 案</span>
            </div>

            <div className="overflow-x-auto overflow-y-auto max-h-[400px] border-t border-slate-300" ref={scrollContainerRef}>
                <div className="min-w-[1200px] relative">
                    {/* Header: Dates */}
                    <div className="flex sticky top-0 z-20 bg-white border-b border-slate-300">
                        <div className="w-48 sticky left-0 z-30 bg-white border-r border-slate-300 p-2 text-xs font-black text-slate-500 uppercase flex items-center justify-center">
                            案件 / 日期
                        </div>
                        {days.map((day, idx) => (
                            <div
                                key={idx}
                                className={`
                                    w-10 flex-shrink-0 border-r border-slate-100 flex flex-col items-center py-1
                                    ${idx % 7 === 0 || idx % 7 === 6 ? 'bg-slate-50' : ''}
                                    ${isSameDay(day, today) ? 'bg-blue-50 border-x-2 border-blue-400' : ''}
                                `}
                            >
                                <span className="text-[10px] font-bold text-slate-400 uppercase">
                                    {format(day, 'E', { locale: zhTW })}
                                </span>
                                <span className={`text-[12px] font-black ${isSameDay(day, today) ? 'text-blue-600' : 'text-slate-700'}`}>
                                    {format(day, 'd')}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Rows: Cases */}
                    {caseActivity.map((c, cIdx) => (
                        <div key={c.id} className="flex border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                            <div className="w-48 sticky left-0 z-10 bg-white border-r border-slate-300 p-2 flex flex-col justify-center shadow-sm">
                                <div className="text-[11px] font-black text-blue-800 group-hover:text-blue-600 truncate">{c.caseNumber}</div>
                                <div className="text-[10px] font-bold text-slate-500 truncate">{c.buyer}</div>
                            </div>

                            <div className="flex relative items-center h-12">
                                {/* Grid Lines Background */}
                                {days.map((day, idx) => (
                                    <div
                                        key={idx}
                                        className={`
                                            w-10 h-full flex-shrink-0 border-r border-slate-50/50 
                                            ${idx % 7 === 0 || idx % 7 === 6 ? 'bg-slate-50/50' : ''}
                                            ${isSameDay(day, today) ? 'bg-blue-50/20' : ''}
                                        `}
                                    />
                                ))}

                                {/* Activity Markers */}
                                {c.activities.map((act, aIdx) => {
                                    const dayOffset = Math.floor((act.date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                    if (dayOffset < 0 || dayOffset > 30) return null;

                                    return (
                                        <div
                                            key={aIdx}
                                            className={`
                                                absolute w-9 h-9 rounded shadow-md flex items-center justify-center text-white text-[11px] font-black transition-all hover:scale-125 hover:z-50 cursor-help border-2 border-white
                                                ${act.color}
                                            `}
                                            style={{ left: `${dayOffset * 40 + 0.5}px` }}
                                            title={`${c.caseNumber} - ${act.label} (${format(act.date, 'MM/dd')})`}
                                        >
                                            {act.label}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div className="p-3 bg-slate-50 border-t border-slate-300 flex flex-wrap gap-4 text-[10px] font-black uppercase text-slate-500">
                {MILESTONES.map(m => (
                    <div key={m.key} className="flex items-center gap-1.5">
                        <div className={`w-3 h-3 rounded ${m.color}`}></div>
                        <span>{m.label.replace('日', '')}</span>
                    </div>
                ))}
                <div className="ml-auto flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-100 border border-blue-400"></div>
                    <span>今日基準</span>
                </div>
            </div>
        </div>
    );
}
