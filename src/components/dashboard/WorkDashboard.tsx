'use client';

import React from 'react';
import AIWorkAssistant from './AIWorkAssistant';
import { useWorkDashboard } from './work-dashboard/useWorkDashboard';
import { UrgentAlerts } from './work-dashboard/UrgentAlerts';
import { TaxWatch } from './work-dashboard/TaxWatch';
import { PipelineView } from './work-dashboard/PipelineView';

interface WorkDashboardProps {
    className?: string;
}

export const WorkDashboard: React.FC<WorkDashboardProps> = ({ className }) => {
    const { loading, urgentTasks, taxTasks, pipelineTasks, completeTask } = useWorkDashboard();

    if (loading) {
        return (
            <div className={`grid grid-cols-1 xl:grid-cols-12 gap-6 ${className}`}>
                <div className="xl:col-span-6 glass-card p-6 h-[400px] skeleton rounded-[32px]" />
                <div className="xl:col-span-6 glass-card p-6 h-[400px] skeleton rounded-[32px]" />
                <div className="xl:col-span-12 glass-card p-6 h-[200px] skeleton rounded-[32px]" />
            </div>
        );
    }

    return (
        <div className={`flex flex-col gap-6 ${className} animate-fade-in`}>
            {/* AI Work Assistant */}
            <div className="w-full">
                <AIWorkAssistant />
            </div>

            {/* Main Dashboard Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* LEFT: Urgent Alerts */}
                <div className="xl:col-span-6">
                    <UrgentAlerts tasks={urgentTasks} onComplete={completeTask} />
                </div>

                {/* RIGHT: Tax Watch */}
                <div className="xl:col-span-6">
                    <TaxWatch tasks={taxTasks} onComplete={completeTask} />
                </div>

                {/* BOTTOM: 7-Day Pipeline (Full Width Horizontal) */}
                <div className="xl:col-span-12">
                    <PipelineView tasks={pipelineTasks} />
                </div>
            </div>
        </div>
    );
};
