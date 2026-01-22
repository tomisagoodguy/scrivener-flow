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
                <div className="xl:col-span-7 space-y-6">
                    <div className="glass-card p-6 h-[400px] skeleton rounded-[32px]" />
                    <div className="glass-card p-6 h-[200px] skeleton rounded-[32px]" />
                </div>
                <div className="xl:col-span-5 glass-card p-6 h-[600px] skeleton rounded-[32px]" />
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
                {/* LEFT COLUMN: Risk Radar (Urgent & Tax) */}
                <div className="xl:col-span-8 space-y-8">
                    {/* 1. Urgent Alerts (Red Zone) */}
                    <UrgentAlerts tasks={urgentTasks} onComplete={completeTask} />

                    {/* 2. Tax Watch */}
                    <TaxWatch tasks={taxTasks} onComplete={completeTask} />
                </div>

                {/* RIGHT COLUMN: 7-Day Pipeline */}
                <div className="xl:col-span-4">
                    <PipelineView tasks={pipelineTasks} />
                </div>
            </div>
        </div>
    );
};
