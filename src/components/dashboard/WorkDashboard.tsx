'use client';

import React from 'react';
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import WelcomeHeader from './WelcomeHeader';
import AIWorkAssistant from './AIWorkAssistant';
import { useWorkDashboard } from './work-dashboard/useWorkDashboard';
import { UrgentAlerts } from './work-dashboard/UrgentAlerts';
import { TaxWatch } from './work-dashboard/TaxWatch';
import { PipelineView } from './work-dashboard/PipelineView';
import TodoContainer from '@/components/todo/TodoContainer';
import EisenhowerMatrix from './eisenhower/EisenhowerMatrix';
import { DashboardWidgetShell } from './DashboardWidgetShell';
import { HiddenWidgetsMenu } from './HiddenWidgetsMenu';
import { useDashboardLayout } from '@/hooks/useDashboardLayout';
import type { DashboardWidgetId } from '@/domain/dashboard/layoutTypes';

interface WorkDashboardProps {
    className?: string;
}

export const WorkDashboard: React.FC<WorkDashboardProps> = ({ className }) => {
    const { loading, urgentTasks, staleTasks, taxTasks, pipelineTasks, completeTask, archiveStaleTasks } = useWorkDashboard();
    const { layout, hideWidget, showWidget, reorderWidgets } = useDashboardLayout();
    const sensors = useSensors(useSensor(PointerSensor), useSensor(TouchSensor));

    const WIDGET_REGISTRY: Partial<Record<DashboardWidgetId, React.ReactNode>> = {
        'ai-work-assistant': <AIWorkAssistant />,
        'urgent-alerts-tax-watch': (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <UrgentAlerts tasks={urgentTasks} staleCount={staleTasks.length} onComplete={completeTask} onArchiveStale={archiveStaleTasks} />
                <TaxWatch tasks={taxTasks} onComplete={completeTask} />
            </div>
        ),
        'pipeline-view': <PipelineView tasks={pipelineTasks} />,
        'eisenhower-matrix': <EisenhowerMatrix />,
        'todo-container': <TodoContainer />,
    };

    if (loading) {
        return (
            <div className={`flex flex-col gap-4 ${className}`}>
                <WelcomeHeader />
                <div className="glass-card p-4 h-12 skeleton rounded-2xl" />
                <div className="grid grid-cols-2 gap-4">
                    <div className="glass-card p-4 h-[240px] skeleton rounded-2xl" />
                    <div className="glass-card p-4 h-[240px] skeleton rounded-2xl" />
                </div>
                <div className="glass-card p-4 h-[160px] skeleton rounded-2xl" />
            </div>
        );
    }

    const visibleWidgetIds = layout
        .filter((w) => w.visible && WIDGET_REGISTRY[w.id])
        .sort((a, b) => a.order - b.order)
        .map((w) => w.id);

    const hiddenWidgetIds = layout.filter((w) => !w.visible && WIDGET_REGISTRY[w.id]).map((w) => w.id);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = visibleWidgetIds.indexOf(active.id as DashboardWidgetId);
        const newIndex = visibleWidgetIds.indexOf(over.id as DashboardWidgetId);
        if (oldIndex === -1 || newIndex === -1) return;

        reorderWidgets(arrayMove(visibleWidgetIds, oldIndex, newIndex));
    };

    return (
        <div className={`flex flex-col gap-4 ${className} animate-fade-in`}>
            <div className="flex items-start justify-between gap-2">
                <WelcomeHeader />
                <HiddenWidgetsMenu hiddenWidgetIds={hiddenWidgetIds} onShow={showWidget} />
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={visibleWidgetIds} strategy={verticalListSortingStrategy}>
                    {visibleWidgetIds.map((id) => (
                        <DashboardWidgetShell key={id} id={id} onHide={() => hideWidget(id)}>
                            {WIDGET_REGISTRY[id]}
                        </DashboardWidgetShell>
                    ))}
                </SortableContext>
            </DndContext>
        </div>
    );
};
