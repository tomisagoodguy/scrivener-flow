import { TaskType } from '../../types';

interface ActiveCase {
    id: string;
    buyer_name: string;
    milestones?: Array<Record<string, string | number | null>>;
    financials?: Array<Record<string, string | number | null>>;
}

interface ExistingTodo {
    id: string;
    case_id: string | null;
    source_key: string | null;
    due_date: string;
    content: string;
    created_at: string;
}

interface SystemTodoInsert {
    user_id: string;
    content: string;
    priority: string;
    due_date: string;
    case_id: string;
    source_type: 'system';
    source_key: string;
    is_completed: false;
}

interface SystemTodoUpdate extends SystemTodoInsert {
    id: string;
    created_at: string;
}

export function generateSystemTasks(
    activeCases: ActiveCase[],
    cleanExistingTodos: ExistingTodo[],
    userId: string,
    today: Date
) {
    const todosToInsert: SystemTodoInsert[] = [];
    const todosToUpdate: SystemTodoUpdate[] = [];
    // 記錄所有「日期存在、已處理」的 key（包含無需更新的現有 todo）
    const processedKeys = new Set<string>();

    const addSystemTask = (
        c: ActiveCase,
        key: string,
        dateStr: string | null | undefined,
        daysBefore: number,
        type: TaskType,
        titlePrefix: string
    ) => {
        if (!dateStr) return;
        // 標記此 key 有效（日期存在）
        processedKeys.add(`${c.id}_${key}`);

        const date = new Date(dateStr);
        const remindDate = new Date(date);
        remindDate.setDate(date.getDate() - daysBefore);

        const exists = cleanExistingTodos.find(t => t.case_id === c.id && t.source_key === key);
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

    activeCases?.forEach(c => {
        const m = (c.milestones?.[0] || {}) as Record<string, string | null>;
        const f = (c.financials?.[0] || {}) as Record<string, string | null>;

        addSystemTask(c, 'sign_diff_date', m.sign_diff_date, 3, 'legal', '補差額');
        addSystemTask(c, 'seal_date', m.seal_date, 3, 'legal', '用印日');

        // 動態報稅提醒逻辑 (顯示範圍改為 30 天)
        const isTaxDayToday = m.seal_date && new Date(m.seal_date).toDateString() === today.toDateString();
        const taxDateDisplay = m.seal_date ? new Date(m.seal_date).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' }) : '';
        const taxTitle = isTaxDayToday ? '今天報稅' : `預計 ${taxDateDisplay} 報稅`;
        addSystemTask(c, 'tax_filing_reminder', m.seal_date, 30, 'tax', taxTitle);

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

        addSystemTask(c, 'land_val_tax', f.land_value_tax_deadline, 5, 'tax', '土地增值稅 - 繳納提醒 (限繳日期)');
        addSystemTask(c, 'deed_tax', f.deed_tax_deadline, 5, 'tax', '契稅 - 繳納提醒 (限繳日期)');
        addSystemTask(c, 'land_tax', f.land_tax_deadline, 5, 'tax', '地價稅 - 繳納提醒 (限繳日期)');
        addSystemTask(c, 'house_tax', f.house_tax_deadline, 5, 'tax', '房屋稅 - 繳納提醒 (限繳日期)');
    });

    return { todosToInsert, todosToUpdate, processedKeys };
}
