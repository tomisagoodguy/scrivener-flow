'use client';

import { useMemo } from 'react';
import { DemoCase } from '@/types';
import { parseISO, format, isWeekend, startOfDay } from 'date-fns';
import {
    TimelineEvent,
    DayGroup,
    MILESTONE_FIELDS,
    APPOINTMENT_FIELDS,
    TAX_DEADLINE_FIELDS,
} from './constants';

/**
 * useTimelineHub
 * 將所有案件的 Milestone/Appointment/Tax/Todo 整合為統一的 TimelineEvent[]
 */
export function useTimelineHub(cases: DemoCase[]) {
    const today = useMemo(() => startOfDay(new Date()), []);

    /** 統一事件列表 */
    const allEvents = useMemo(() => {
        const events: TimelineEvent[] = [];

        cases.forEach((c) => {
            const m = ((Array.isArray(c.milestones) ? c.milestones[0] : c.milestones) || {}) as Record<string, unknown>;
            const f = ((Array.isArray(c.financials) ? c.financials[0] : c.financials) || {}) as Record<string, unknown>;

            // 1. Milestones
            MILESTONE_FIELDS.forEach((field) => {
                const dateStr = m[field.key] as string | undefined;
                if (!dateStr) return;
                try {
                    events.push({
                        id: `${c.id}-${field.key}`,
                        caseId: c.id,
                        caseNumber: c.case_number,
                        buyerName: c.buyer_name,
                        sellerName: c.seller_name,
                        date: parseISO(dateStr),
                        category: 'milestone',
                        key: field.key,
                        label: field.label,
                        icon: field.icon,
                        color: field.bg,
                        textColor: field.text,
                        shape: 'square',
                        isCompleted: parseISO(dateStr) < today,
                    });
                } catch { /* skip invalid dates */ }
            });

            // 2. Appointments (Supporting datetime-local strings)
            APPOINTMENT_FIELDS.forEach((field) => {
                const dateStr = m[field.key] as string | undefined;
                if (!dateStr) return;
                try {
                    // datetime-local gives "YYYY-MM-DDTHH:mm", parseISO handles this but we need to be careful about local time vs UTC.
                    // parseISO will treat it as local if no offset is provided.
                    const parsedDate = parseISO(dateStr);
                    events.push({
                        id: `${c.id}-${field.key}`,
                        caseId: c.id,
                        caseNumber: c.case_number,
                        buyerName: c.buyer_name,
                        sellerName: c.seller_name,
                        date: parsedDate,
                        category: 'appointment',
                        key: field.key,
                        label: field.label,
                        icon: field.icon,
                        color: field.bg,
                        textColor: field.text,
                        shape: 'circle',
                        isCompleted: parsedDate < today,
                        // For appointments, show the time in the content if available
                        content: dateStr.includes('T') ? `⏰ 時間: ${format(parsedDate, 'HH:mm')}` : undefined,
                    });
                } catch { /* skip */ }
            });

            // 3. Tax Deadlines (from financials)
            TAX_DEADLINE_FIELDS.forEach((field) => {
                const dateStr = f[field.key] as string | undefined;
                if (!dateStr) return;
                try {
                    events.push({
                        id: `${c.id}-${field.key}`,
                        caseId: c.id,
                        caseNumber: c.case_number,
                        buyerName: c.buyer_name,
                        sellerName: c.seller_name,
                        date: parseISO(dateStr),
                        category: 'tax_deadline',
                        key: field.key,
                        label: field.label,
                        icon: field.icon,
                        color: field.bg,
                        textColor: field.text,
                        shape: 'triangle',
                        isCompleted: parseISO(dateStr) < today,
                    });
                } catch { /* skip */ }
            });

            // 4. Manual Todos with due_date
            if (c.todos_list) {
                c.todos_list.forEach((todo) => {
                    if (todo.is_deleted || todo.is_completed || !todo.due_date) return;
                    try {
                        const parsedDate = parseISO(todo.due_date);

                        // 檢查同一天是否已經有該案件的 Milestone, Appointment 或 Tax Deadline
                        const sameDayEvents = events.filter(e => 
                            e.category !== 'todo' && 
                            e.caseId === c.id && 
                            format(e.date, 'yyyy-MM-dd') === format(parsedDate, 'yyyy-MM-dd')
                        );

                        if (sameDayEvents.length > 0) {
                            // 若有，將待辦內容「合併」到該里程碑的 content 中，不額外產生待辦卡片
                            // 這樣即使有重要的自訂手動待辦，也不會遺失，而是作為補充說明顯示在里程碑卡片上
                            const target = sameDayEvents[0];
                            target.content = target.content 
                                ? `${target.content}\n📌 ${todo.content}`
                                : `📌 ${todo.content}`;
                            return;
                        }

                        events.push({
                            id: `${c.id}-todo-${todo.id}`,
                            caseId: c.id,
                            caseNumber: c.case_number,
                            buyerName: c.buyer_name,
                            sellerName: c.seller_name,
                            date: parsedDate,
                            category: 'todo',
                            key: 'todo',
                            label: '待辦',
                            icon: '📝',
                            color: 'bg-amber-100',
                            textColor: 'text-amber-700',
                            shape: 'pill',
                            isCompleted: false,
                            content: todo.content,
                        });
                    } catch { /* skip */ }
                });
            }
        });

        return events.sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [cases, today]);

    /** 按日期分組 */
    const dayGroups = useMemo(() => {
        const map = new Map<string, TimelineEvent[]>();

        allEvents.forEach((evt) => {
            const key = format(evt.date, 'yyyy-MM-dd');
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(evt);
        });

        const groups: DayGroup[] = [];
        const todayKey = format(today, 'yyyy-MM-dd');

        map.forEach((events, dateKey) => {
            const date = parseISO(dateKey);
            groups.push({
                date,
                dateKey,
                events,
                isToday: dateKey === todayKey,
                isWeekend: isWeekend(date),
            });
        });

        return groups.sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [allEvents, today]);

    /** 今日 + 明天事件 */
    const todayTomorrow = useMemo(() => {
        const todayKey = format(today, 'yyyy-MM-dd');
        const tomorrowKey = format(new Date(today.getTime() + 86400000), 'yyyy-MM-dd');
        return allEvents.filter((e) => {
            const key = format(e.date, 'yyyy-MM-dd');
            return key === todayKey || key === tomorrowKey;
        });
    }, [allEvents, today]);

    /** 按案件分組 (甘特圖用) */
    const caseTimelines = useMemo(() => {
        const map = new Map<string, TimelineEvent[]>();

        allEvents.forEach((evt) => {
            if (!map.has(evt.caseId)) map.set(evt.caseId, []);
            map.get(evt.caseId)!.push(evt);
        });

        return Array.from(map.entries()).map(([caseId, events]) => ({
            caseId,
            caseNumber: events[0].caseNumber,
            buyerName: events[0].buyerName,
            events,
        }));
    }, [allEvents]);

    /** 統計 */
    const stats = useMemo(() => {
        const todayKey = format(today, 'yyyy-MM-dd');
        const todayEvents = allEvents.filter((e) => format(e.date, 'yyyy-MM-dd') === todayKey);

        // 未來 7 天
        const next7 = new Date(today.getTime() + 7 * 86400000);
        const weekEvents = allEvents.filter((e) => e.date >= today && e.date < next7);

        // 逾期 (日期小於今天且未完成，目前只有未完成的 todo 才會被認定為逾期)
        const overdue = allEvents.filter((e) => e.date < today && !e.isCompleted);

        return {
            todayCount: todayEvents.length,
            weekCount: weekEvents.length,
            overdueCount: overdue.length,
            totalCases: cases.length,
        };
    }, [allEvents, today, cases.length]);

    /** 下一個注意事項推播 (近期即將發生的未完成事件) */
    const upcomingAttentions = useMemo(() => {
        // 從 allEvents 找出 >= today 且 !isCompleted，並增加「提前提醒」邏輯
        return allEvents.filter(e => {
            if (e.isCompleted) return false;
            
            const diffDays = Math.ceil((e.date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            
            // 只要是未來的事件，原本就會在時間軸看到。這裡是用來「提早推播」到焦點區：
            // 1. 約客 (Appointment): 前 3 天開始提醒
            if (e.category === 'appointment') return diffDays <= 3 && diffDays >= 0;
            
            // 2. 稅單截止日 (Tax Deadline): 前 5 天開始提醒
            if (e.category === 'tax_deadline') return diffDays <= 5 && diffDays >= 0;
            
            // 3. 里程碑或待辦: 今天或明天即將發生的 (預設)
            return diffDays <= 1 && diffDays >= 0;
        }).sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 10);
    }, [allEvents, today]);

    return {
        today,
        allEvents,
        dayGroups,
        todayTomorrow,
        caseTimelines,
        stats,
        upcomingAttentions,
    };
}
