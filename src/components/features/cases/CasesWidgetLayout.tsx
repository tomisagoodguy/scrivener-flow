'use client';

import React from 'react';
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import type { DemoCase } from '@/types';
import ExportExcelButton from './ExportExcelButton';
import ExportHtmlButton from './ExportHtmlButton';
import { CasesRapidInput } from './CasesRapidInput';
import CaseQuickNavigator from './CaseQuickNavigator';
import GlobalPipelineChart from '@/components/dashboard/GlobalPipelineChart';
import EisenhowerMatrix from '@/components/dashboard/eisenhower/EisenhowerMatrix';
import { DashboardWidgetShell } from '@/components/dashboard/DashboardWidgetShell';
import { HiddenWidgetsMenu } from '@/components/dashboard/HiddenWidgetsMenu';
import { useCasesLayout } from '@/hooks/useCasesLayout';
import { CASES_WIDGET_LABELS, type CasesWidgetId } from '@/domain/cases/layoutTypes';

interface RapidInputCaseRef {
    id: string;
    case_number: string;
    buyer_name: string;
    seller_name: string;
}

interface CasesWidgetLayoutProps {
    /** 頁面標題（案件管理中心），與隱藏板塊入口同列渲染 */
    title: string;
    /** 案件總數，顯示於標題旁的計數徽章 */
    caseCount: number;
    /** 用於匯出按鈕（Excel/HTML），需要完整案件欄位 */
    cases: DemoCase[];
    /** 用於快速導航與案件進度總覽圖表 */
    monitoringCases: DemoCase[];
    /** 用於閃電快速輸入列，只需案號與買賣方姓名 */
    rapidInputCases: RapidInputCaseRef[];
    stageParam?: string;
    /** 目前分頁是否顯示 Monitoring 內容（Memo/Timeline/Pending/Closed 皆為 false） */
    showMonitoringWidgets: boolean;
    /** 標題列與板塊堆疊之間插入的內容（分頁列 + 搜尋欄），維持 Server Component 渲染 */
    children?: React.ReactNode;
}

export function CasesWidgetLayout({
    title,
    caseCount,
    cases,
    monitoringCases,
    rapidInputCases,
    stageParam,
    showMonitoringWidgets,
    children,
}: CasesWidgetLayoutProps) {
    const { layout, hideWidget, showWidget, reorderWidgets } = useCasesLayout();
    const sensors = useSensors(useSensor(PointerSensor), useSensor(TouchSensor));

    const WIDGET_REGISTRY: Partial<Record<CasesWidgetId, React.ReactNode>> = {
        'export-buttons': (
            <div className="flex items-center gap-3">
                <ExportExcelButton cases={cases} />
                <ExportHtmlButton cases={cases} />
            </div>
        ),
        'rapid-input': <CasesRapidInput cases={rapidInputCases} />,
        'quick-navigator': <CaseQuickNavigator cases={monitoringCases} />,
        ...(showMonitoringWidgets
            ? {
                  'pipeline-chart': <GlobalPipelineChart cases={monitoringCases} currentStage={stageParam} />,
                  'eisenhower-matrix': <EisenhowerMatrix collapsible defaultCollapsed />,
              }
            : {}),
    };

    const visibleWidgetIds = layout
        .filter((w) => w.visible && WIDGET_REGISTRY[w.id])
        .sort((a, b) => a.order - b.order)
        .map((w) => w.id);

    const hiddenWidgetIds = layout.filter((w) => !w.visible && WIDGET_REGISTRY[w.id]).map((w) => w.id);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = visibleWidgetIds.indexOf(active.id as CasesWidgetId);
        const newIndex = visibleWidgetIds.indexOf(over.id as CasesWidgetId);
        if (oldIndex === -1 || newIndex === -1) return;

        reorderWidgets(arrayMove(visibleWidgetIds, oldIndex, newIndex));
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h1>
                <span className="text-xs font-bold bg-blue-500/10 text-blue-600 px-3 py-1 rounded-full border border-blue-500/20">
                    {caseCount} TOTAL
                </span>
                <HiddenWidgetsMenu hiddenWidgetIds={hiddenWidgetIds} onShow={showWidget} labels={CASES_WIDGET_LABELS} placement="right" />
            </div>
            {children}
            <DndContext id="cases-widget-layout" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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
}
