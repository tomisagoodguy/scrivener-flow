'use client';

import React from 'react';
import AIWorkAssistant from './AIWorkAssistant';
import { useWorkDashboard } from './work-dashboard/useWorkDashboard';
import { UrgentAlerts } from './work-dashboard/UrgentAlerts';
import { TaxWatch } from './work-dashboard/TaxWatch';
import { PipelineView } from './work-dashboard/PipelineView';
import TodoContainer from '@/components/todo/TodoContainer';

interface WorkDashboardProps {
    className?: string;
}

export const WorkDashboard: React.FC<WorkDashboardProps> = ({ className }) => {
    const { loading, urgentTasks, staleTasks, taxTasks, pipelineTasks, completeTask, archiveStaleTasks } = useWorkDashboard();

    if (loading) {
        return (
            <div className={`flex flex-col gap-4 ${className}`}>
                <div className="glass-card p-4 h-12 skeleton rounded-2xl" />
                <div className="grid grid-cols-2 gap-4">
                    <div className="glass-card p-4 h-[240px] skeleton rounded-2xl" />
                    <div className="glass-card p-4 h-[240px] skeleton rounded-2xl" />
                </div>
                <div className="glass-card p-4 h-[160px] skeleton rounded-2xl" />
            </div>
        );
    }

    return (
        <div className={`flex flex-col gap-4 ${className} animate-fade-in`}>
                <AIWorkAssistant />

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <UrgentAlerts tasks={urgentTasks} staleCount={staleTasks.length} onComplete={completeTask} onArchiveStale={archiveStaleTasks} />
                    <TaxWatch tasks={taxTasks} onComplete={completeTask} />
                </div>

                <PipelineView tasks={pipelineTasks} />

                <TodoContainer />
        </div>
    );
};
