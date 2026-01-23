import { TodoTask, TaskType } from '../../types';

export const mapTodosToState = (todos: any[], cases: any[], activeCaseIds: Set<string>): TodoTask[] => {
    return todos
        .filter((t) => !t.is_deleted)
        .filter((t) => {
            if (t.case_id && !activeCaseIds.has(t.case_id)) return false;
            return true;
        })
        .filter((t) => {
            if (t.source_key === 'contract_date') return false;
            if (t.source_key === 'sign_appt') return false;
            if (t.content?.includes('簽約日')) return false;
            if (t.content?.includes('簽約約定')) return false;
            return true;
        })
        .filter((t) => {
            if (!t.is_completed) return true;
            const d = new Date(t.due_date || t.created_at);
            const tDate = d.toISOString().split('T')[0];
            const nowStr = new Date().toISOString().split('T')[0];
            return tDate >= nowStr;
        })
        .map((t) => {
            let type: TaskType = 'personal';
            if (t.source_type === 'system') {
                if (t.source_key?.includes('tax')) type = 'tax';
                else if (t.source_key?.includes('appt')) type = 'appointment';
                else if (t.source_key?.includes('date')) type = 'legal';
            }

            const relatedCase = cases.find((c) => c.id === t.case_id);

            return {
                id: t.id,
                title: t.content,
                type: type,
                date: new Date(t.due_date || t.created_at),
                isCompleted: t.is_completed,
                priority: t.priority || 'not-urgent-important',
                caseName: relatedCase ? relatedCase.buyer_name : undefined,
                caseId: t.case_id,
                notes: t.source_type === 'system' ? '系統自動提醒' : undefined,
            };
        });
};
