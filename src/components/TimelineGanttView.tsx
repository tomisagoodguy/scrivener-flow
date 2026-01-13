'use client';

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { DemoCase } from '@/types';
import { format, addDays, isSameDay, parseISO, startOfDay, eachDayOfInterval } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { createClient } from '@/lib/auth/client';
import { GoogleCalendarService, GoogleCalendarEvent } from '@/lib/googleCalendar';

interface TimelineGanttViewProps {
    cases: DemoCase[];
}

const MILESTONES = [
    { key: 'contract_date', label: '簽', color: 'bg-blue-500', icon: '✍️' },
    { key: 'seal_date', label: '印', color: 'bg-indigo-500', icon: '印' },
    { key: 'tax_payment_date', label: '稅', color: 'bg-emerald-500', icon: '稅' },
    { key: 'transfer_date', label: '過', color: 'bg-purple-500', icon: '過' },
    { key: 'handover_date', label: '交', color: 'bg-red-500', icon: '交' },
];

export default function TimelineGanttView({ cases }: TimelineGanttViewProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const today = useMemo(() => startOfDay(new Date()), []);
    const days = useMemo(() => {
        return eachDayOfInterval({
            start: today,
            end: addDays(today, 30)
        });
    }, [today]);

    // Google Calendar State
    const [gCalEvents, setGCalEvents] = useState<GoogleCalendarEvent[]>([]);
    const [hasGCalAccess, setHasGCalAccess] = useState(false);
    const [isLoadingGCal, setIsLoadingGCal] = useState(true);

    useEffect(() => {
        let isMounted = true;
        async function loadGCal() {
            try {
                const supabase = createClient();
                const { data: { session } } = await supabase.auth.getSession();
                const token = (session as any)?.provider_token;

                if (token) {
                    if (isMounted) setHasGCalAccess(true);
                    const service = new GoogleCalendarService(token);
                    // Fetch range: today to +30 days
                    const rangeStart = today.toISOString();
                    const rangeEnd = addDays(today, 30).toISOString();

                    const events = await service.listEvents('primary', rangeStart, rangeEnd);
                    if (isMounted) setGCalEvents(events || []);
                } else {
                    if (isMounted) setHasGCalAccess(false);
                }
            } catch (e) {
                console.error('Failed to load Google Calendar events:', e);
            } finally {
                if (isMounted) setIsLoadingGCal(false);
            }
        }
        loadGCal();
        return () => { isMounted = false; };
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

    const handleLogin = async () => {
        const supabase = createClient();
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
                scopes: 'https://www.googleapis.com/auth/calendar.events'
            }
        });
    };

    return (
        <div className="bg-card border border-border/50 shadow-sm mb-8 overflow-hidden rounded-xl">
            <div
                className="bg-muted/40 p-3 flex justify-between items-center border-b border-border/50 cursor-pointer hover:bg-muted/60 transition-colors select-none"
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <div className="flex items-center gap-3">
                    <h3 className="text-foreground font-black flex items-center gap-2">
                        <span className="text-xl">📅</span> 30 日進度甘特圖 (Gantt Monitoring)
                    </h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isCollapsed ? 'bg-secondary text-secondary-foreground' : 'bg-primary/10 text-primary'}`}>
                        {isCollapsed ? '已收折' : '展開中'}
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase underline">僅顯示案量：{caseActivity.length} 案</span>
                    <button className="text-muted-foreground w-6 h-6 flex items-center justify-center rounded-full hover:bg-background transition-colors">
                        {isCollapsed ? '▼' : '▲'}
                    </button>
                </div>
            </div>

            {!isCollapsed && (
                <>
                    <div className="overflow-x-auto overflow-y-auto max-h-[300px]" ref={scrollContainerRef}>
                        <div className="min-w-[1200px] relative">
                            {/* Header: Dates */}
                            <div className="flex sticky top-0 z-20 bg-card border-b border-border/50 shadow-sm">
                                <div className="w-48 sticky left-0 z-30 bg-card border-r border-border/50 p-2 text-xs font-black text-foreground/70 uppercase flex items-center justify-center">
                                    案件 / 日期
                                </div>
                                {days.map((day, idx) => (
                                    <div
                                        key={idx}
                                        className={`
                                    w-10 flex-shrink-0 border-r border-border/30 flex flex-col items-center py-1
                                    ${idx % 7 === 0 || idx % 7 === 6 ? 'bg-muted/20' : ''}
                                    ${isSameDay(day, today) ? 'bg-primary/10 border-x-2 border-primary' : ''}
                                `}
                                    >
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                            {format(day, 'E', { locale: zhTW })}
                                        </span>
                                        <span className={`text-[12px] font-black ${isSameDay(day, today) ? 'text-primary' : 'text-foreground'}`}>
                                            {format(day, 'd')}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Google Calendar Row (Always Visible) */}
                            <div className="flex border-b border-border/30 bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group">
                                <div className="w-48 sticky left-0 z-10 bg-card border-r border-border/50 p-2 flex flex-col justify-center shadow-sm">
                                    <div className="text-[11px] font-black text-blue-600 dark:text-blue-400 group-hover:text-blue-500 truncate">
                                        📅 我的行事曆
                                    </div>
                                    <div className="text-[10px] font-bold text-muted-foreground truncate">
                                        Google Calendar
                                    </div>
                                </div>

                                <div className="flex relative items-center h-12 w-full">
                                    {/* Grid Lines */}
                                    <div className="absolute inset-0 flex h-full pointer-events-none">
                                        {days.map((day, idx) => (
                                            <div
                                                key={idx}
                                                className={`
                                            w-10 h-full flex-shrink-0 border-r border-border/20 
                                            ${idx % 7 === 0 || idx % 7 === 6 ? 'bg-muted/10' : ''}
                                            ${isSameDay(day, today) ? 'bg-primary/5' : ''}
                                        `}
                                            />
                                        ))}
                                    </div>

                                    {/* State Handling: Loading, Error, or Events */}
                                    {isLoadingGCal ? (
                                        <div className="flex items-center px-4 text-xs text-gray-400 font-bold">
                                            <span className="animate-pulse">載入行事曆中...</span>
                                        </div>
                                    ) : !hasGCalAccess ? (
                                        <div className="flex items-center px-4 z-40">
                                            <button
                                                onClick={handleLogin}
                                                className="text-[10px] bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded font-bold shadow-sm transition-all"
                                            >
                                                連結/重新登入 Google 帳號
                                            </button>
                                            <span className="ml-2 text-[10px] text-gray-400">無法讀取行事曆 (Token 過期)</span>
                                        </div>
                                    ) : (
                                        // Render Events
                                        gCalEvents.map((evt, eIdx) => {
                                            const start = evt.start.dateTime ? parseISO(evt.start.dateTime) : (evt.start.date ? parseISO(evt.start.date) : null);
                                            if (!start) return null;

                                            const dayOffset = Math.floor((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                            if (dayOffset < 0 || dayOffset > 30) return null;

                                            return (
                                                <div
                                                    key={eIdx}
                                                    className={`
                                                        absolute rounded shadow-sm flex items-center justify-start px-1 text-[10px] font-medium transition-all cursor-help border border-blue-200 dark:border-blue-800
                                                        bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 overflow-hidden hover:overflow-visible w-[36px] hover:w-auto z-30 hover:z-[100] hover:max-w-none hover:whitespace-nowrap hover:shadow-xl
                                                    `}
                                                    style={{
                                                        left: `${dayOffset * 40 + 2}px`,
                                                        height: '28px',
                                                    }}
                                                    title={`[行事曆] ${evt.summary}\n${start.toLocaleTimeString()}`}
                                                >
                                                    <span className="truncate w-full block">
                                                        {evt.summary}
                                                    </span>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* Rows: Cases */}
                            {caseActivity.map((c, cIdx) => (
                                <div key={c.id} className="flex border-b border-border/30 hover:bg-muted/20 transition-colors group">
                                    <div className="w-48 sticky left-0 z-10 bg-card border-r border-border/50 p-2 flex flex-col justify-center shadow-sm">
                                        <div className="text-[11px] font-black text-primary group-hover:text-primary/80 truncate">{c.caseNumber}</div>
                                        <div className="text-[10px] font-bold text-muted-foreground truncate">{c.buyer}</div>
                                    </div>

                                    <div className="flex relative items-center h-12">
                                        {/* Grid Lines Background */}
                                        {days.map((day, idx) => (
                                            <div
                                                key={idx}
                                                className={`
                                            w-10 h-full flex-shrink-0 border-r border-border/20 
                                            ${idx % 7 === 0 || idx % 7 === 6 ? 'bg-muted/10' : ''}
                                            ${isSameDay(day, today) ? 'bg-primary/5' : ''}
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
                                                absolute w-9 h-9 rounded shadow-md flex items-center justify-center text-white text-[11px] font-black transition-all hover:scale-125 hover:z-50 cursor-help border-2 border-card
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
                    <div className="p-3 bg-muted/20 border-t border-border/50 flex flex-wrap gap-4 text-[10px] font-black uppercase text-muted-foreground">
                        {MILESTONES.map(m => (
                            <div key={m.key} className="flex items-center gap-1.5">
                                <div className={`w-3 h-3 rounded ${m.color}`}></div>
                                <span>{m.label.replace('日', '')}</span>
                            </div>
                        ))}
                        <div className="ml-auto flex items-center gap-2">
                            <div className="w-3 h-3 bg-primary/10 border border-primary"></div>
                            <span>今日基準</span>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
