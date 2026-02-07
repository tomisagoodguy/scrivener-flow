import { TaskType } from '../../types';

export function generateSystemTasks(
    activeCases: any[],
    cleanExistingTodos: any[],
    userId: string,
    today: Date
) {
    const todosToInsert: any[] = [];
    const todosToUpdate: any[] = [];

    const addSystemTask = (
        c: any,
        key: string,
        dateStr: string | null,
        daysBefore: number,
        type: TaskType,
        titlePrefix: string
    ) => {
        if (!dateStr) return;
        const date = new Date(dateStr);
        const remindDate = new Date(date);
        remindDate.setDate(date.getDate() - daysBefore);

        const exists = cleanExistingTodos.find((t: any) => t.case_id === c.id && t.source_key === key);
        const isUrgent = today >= remindDate;
        const isAppointment = type === 'appointment';

        const dateDisplay = isAppointment
            ? new Date(dateStr).toLocaleString('zh-TW', {
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            })
            : new Date(dateStr).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });

        const newTitle = `${c.buyer_name} 案 - ${titlePrefix} (${dateDisplay})`;

        if (exists) {
            const oldDate = new Date(exists.due_date).getTime();
            const newDateVal = new Date(dateStr).getTime();

            if (Math.abs(oldDate - newDateVal) > 60000 || exists.content !== newTitle) {
                todosToUpdate.push({
                    id: exists.id,
                    user_id: userId,
                    content: newTitle,
                    priority: isUrgent ? 'urgent-important' : 'not-urgent-important',
                    due_date: dateStr,
                    case_id: c.id,
                    source_type: 'system',
                    source_key: key,
                    is_completed: false,
                    created_at: exists.created_at,
                });
            }
        } else {
            todosToInsert.push({
                user_id: userId,
                content: newTitle,
                priority: isUrgent ? 'urgent-important' : 'not-urgent-important',
                due_date: dateStr,
                case_id: c.id,
                source_type: 'system',
                source_key: key,
                is_completed: false,
            });
        }
    };

    activeCases?.forEach((c: any) => {
        const m = c.milestones?.[0] || {};
        const f = c.financials?.[0] || {};

        addSystemTask(c, 'sign_diff_date', m.sign_diff_date, 3, 'legal', '補差額');
        addSystemTask(c, 'seal_date', m.seal_date, 3, 'legal', '用印日');
        addSystemTask(c, 'tax_payment_date', m.tax_payment_date, 3, 'legal', '完稅日');

        // 計算貸款差額提醒 (Shortfall Reminder)
        const balance = Number(m.balance_amount || 0);
        const loan = Number(m.loan_approved_amount || 0);

        if (m.tax_payment_date && loan > 0 && balance > loan) {
            const shortfall = balance - loan;
            addSystemTask(
                c,
                'shortfall_payment_alert',
                m.tax_payment_date,
                3,
                'legal',
                `需補差額 ${shortfall} 萬`
            );
        }

        addSystemTask(c, 'transfer_date', m.transfer_date, 3, 'legal', '過戶日');
        addSystemTask(c, 'redemption_date', m.redemption_date, 3, 'legal', '代償日');
        addSystemTask(c, 'handover_date', m.handover_date, 3, 'legal', '交屋日');

        addSystemTask(c, 'seal_appt', m.seal_appointment, 3, 'appointment', '用印約定');
        addSystemTask(c, 'tax_appt', m.tax_appointment, 3, 'appointment', '完稅約定');
        addSystemTask(c, 'handover_appt', m.handover_appointment, 3, 'appointment', '交屋約定');

        addSystemTask(c, 'land_val_tax', f.land_value_tax_deadline, 5, 'tax', '土增稅限繳');
        addSystemTask(c, 'deed_tax', f.deed_tax_deadline, 5, 'tax', '契稅限繳');
        addSystemTask(c, 'land_tax', f.land_tax_deadline, 5, 'tax', '地價稅限繳');
        addSystemTask(c, 'house_tax', f.house_tax_deadline, 5, 'tax', '房屋稅限繳');
    });

    return { todosToInsert, todosToUpdate };
}