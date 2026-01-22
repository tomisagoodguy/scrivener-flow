import { DemoCase } from '@/types';

export interface TimelineGanttViewProps {
    cases: DemoCase[];
}

export type ShapeType = 'square' | 'circle' | 'pill';

export interface TimelineActivity {
    date: Date;
    type: string;
    color: string;
    label: string;
    content?: string;
    shape: ShapeType;
    isAppointment?: boolean;
    slot?: number;
}

export interface ProcessedCaseActivity {
    id: string;
    caseNumber: string;
    buyer: string;
    activities: TimelineActivity[];
    maxSlots: number;
}

export interface HoveredMarkerInfo {
    content: string;
    time: string;
    date: string;
    caseNumber: string;
}
