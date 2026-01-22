import { useMemo } from 'react';
import { DemoCase } from '@/types';
import { parseISO, startOfDay, addDays, eachDayOfInterval, format } from 'date-fns';
import { MILESTONES, TAX_DEADLINES, APPOINTMENTS } from './constants';
import { ProcessedCaseActivity, TimelineActivity } from './types';

export function useTimelineData(cases: DemoCase[], showEmpty: boolean) {
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
            .map((c): ProcessedCaseActivity => {
                const m = (c.milestones?.[0] || {}) as any;
                const f = (c.financials?.[0] || {}) as any;
                const activities: TimelineActivity[] = [];

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

    return {
        today,
        days,
        caseActivity
    };
}
