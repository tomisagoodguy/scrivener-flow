import { supabase } from '@/lib/supabaseClient';
import { TodoTask } from '@/components/todo/types';

export async function fetchSystemTasks(): Promise<TodoTask[]> {
    const { data: cases, error } = await supabase
        .from('cases')
        .select(`
            id, case_number, buyer_name, seller_name, status,
            milestones (
                contract_date, seal_date, tax_payment_date, transfer_date, redemption_date, handover_date,
                sign_diff_date,
                seal_appointment, tax_appointment, handover_appointment
            ),
            financials (
                land_value_tax_deadline, deed_tax_deadline, land_tax_deadline, house_tax_deadline
            )
        `)
        .neq('status', 'Closed');

    if (error) {
        console.error('Error fetching system tasks:', error);
        return [];
    }
    if (!cases) return [];

    const tasks: TodoTask[] = [];

    cases.forEach((c: any) => {
        const m = c.milestones?.[0] || {};
        const f = c.financials?.[0] || {};
        const caseName = `${c.case_number ? c.case_number + ' ' : ''}${c.buyer_name}/${c.seller_name}`;

        // Helper to add task
        // We set the date to the ACTUAL Target Date.
        // The display logic in TodoContainer or ListViews should handle "Reminder Window" if needed,
        // OR we can add a 'visual' flag.
        // However, for standard calendar integration, the 'date' should be the Due Date/Event Date.
        const add = (dateStr: string | null, title: string, type: 'legal' | 'tax' | 'appointment', remindDays: number) => {
            if (!dateStr) return;
            const targetDate = new Date(dateStr);
            const now = new Date();

            // Calculate Reminder Start Date
            const reminderStart = new Date(targetDate);
            reminderStart.setDate(targetDate.getDate() - remindDays);

            // Logic: Do we only show it if we are past the reminder start?
            // User said: "System will remind starting 3 days before".
            // If we assume this request means "Don't show it at all before", then we filter here.
            // But usually users want to see "Future" events in the calendar.
            // Let's assume we show ALL, but maybe the UI emphasizes them when close.
            // Or, strictly following "System will remind", maybe we tag them with 'isReminding'.
            // For now, I'll return them all. The UI usually handles "Upcoming".

            tasks.push({
                id: `sys-${c.id}-${title}`,
                title: `${caseName} - ${title}`,
                type,
                date: targetDate,
                isCompleted: false, // System tasks are incomplete until the case is updated/actioned.
                priority: 'urgent-important', // High priority by default for system vents
                caseId: c.id,
                caseName: c.case_number,
                notes: `提醒: ${remindDays} 天前開始通知 (期限: ${dateStr})`
            });
        };

        // Legal Dates (3 days before)
        add(m.contract_date, '簽約', 'legal', 3);
        add(m.sign_diff_date, '補差額', 'legal', 3);
        add(m.seal_date, '用印', 'legal', 3);
        add(m.tax_payment_date, '完稅', 'legal', 3);
        add(m.transfer_date, '過戶', 'legal', 3);
        add(m.redemption_date, '代償', 'legal', 3);
        add(m.handover_date, '交屋', 'legal', 3);

        // Appointments (3 days before)
        add(m.seal_appointment, '用印約定', 'appointment', 3);
        add(m.tax_appointment, '完稅約定', 'appointment', 3);
        add(m.handover_appointment, '交屋約定', 'appointment', 3);

        // Tax (5 days before)
        add(f.land_value_tax_deadline, '土增稅限繳', 'tax', 5);
        add(f.deed_tax_deadline, '契稅限繳', 'tax', 5);
        add(f.land_tax_deadline, '地價稅限繳', 'tax', 5);
        add(f.house_tax_deadline, '房屋稅限繳', 'tax', 5);
    });

    return tasks;
}
