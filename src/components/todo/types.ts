export type TaskType = 'legal' | 'tax' | 'appointment' | 'personal';
export type Priority = 'urgent-important' | 'not-urgent-important' | 'urgent-not-important' | 'not-urgent-not-important';

export interface TodoTask {
    id: string;
    title: string;
    type: TaskType;
    date: Date;
    isCompleted: boolean;
    priority: Priority;
    caseName?: string;
    caseId?: string;
    notes?: string;
}
