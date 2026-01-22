export type FilterType = 'all' | 'future' | 'today' | 'expired';

export interface ScheduleItem {
    id: string;
    content: string;
    due_date: string;
    priority: string;
    is_completed: boolean;
    type: string;
    source_type?: string;
    case_id?: string;
    user_id?: string;
}
