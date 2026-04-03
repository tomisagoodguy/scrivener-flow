'use client';

import React from 'react';

// Components
import CaseScheduleManager from '@/components/features/cases/CaseScheduleManager';
import CaseMessageGenerator from '@/components/features/cases/CaseMessageGenerator';

// Refactored Sub-components
import { PipelineStatus } from './edit-case/PipelineStatus';
import { BasicInfoSection } from './edit-case/BasicInfoSection';
import { CustomAttributesSection } from './edit-case/CustomAttributesSection';
import { ChecklistSection } from './edit-case/ChecklistSection';
import { MilestonesSection } from './edit-case/MilestonesSection';
import { AppointmentsSection } from './edit-case/AppointmentsSection';
import { TaxDeadlinesSection } from './edit-case/TaxDeadlinesSection';
import { NotesSection } from './edit-case/NotesSection';
import { AuditLogSection } from './edit-case/AuditLogSection';
import { FormActions } from './edit-case/FormActions';

// Hook & Types
import { useEditCase } from './edit-case/useEditCase';
import { stripHtml } from './edit-case/caseUtils';
import { DemoCase } from '@/types';

interface EditCaseFormProps {
    initialData: DemoCase;
}

export default function EditCaseForm({ initialData }: EditCaseFormProps) {
    const {
        loading,
        notes,
        setNotes,
        transferNote,
        setTransferNote,
        errorMsg,
        debugInfo,
        privateNotes,
        setPrivateNotes,
        currentUserEmail,
        attributes,
        setAttributes,
        isAttributesExpanded,
        setIsAttributesExpanded,
        showDeleteConfirm,
        setShowDeleteConfirm,
        saveStatus,
        lastSaved,
        handleSubmit,
        performDelete,
        handleFileUpload
    } = useEditCase(initialData);

    const milestones = (initialData.milestones?.[0] || {}) as any;
    const financials = (initialData.financials?.[0] || {}) as any;

    return (
        <form
            onSubmit={handleSubmit}
            className="bg-card glass-card p-5 rounded shadow-sm animate-slide-up space-y-5 border border-card-border"
        >
            {/* 錯誤與狀態提示區 */}
            {(errorMsg || loading) && (
                <div
                    className={`p-4 rounded-xl border-2 transition-all ${errorMsg ? 'bg-red-500/10 border-red-500 text-red-600 font-bold' : 'bg-primary/10 border-primary text-primary'}`}
                >
                    <div className="flex items-center gap-2">
                        {errorMsg ? '❌ ' : 'ℹ️ '}
                        <span>{errorMsg || debugInfo}</span>
                    </div>
                </div>
            )}

            {/* 案件全流程監控 */}
            <PipelineStatus initialData={initialData} />

            {/* 基本資料與屬性 */}
            <div className="space-y-4">
                <BasicInfoSection
                    initialData={initialData}
                    financials={financials}
                    handleFileUpload={handleFileUpload}
                    loading={loading}
                    attributes={attributes}
                />

                <CustomAttributesSection
                    attributes={attributes}
                    setAttributes={setAttributes}
                    isAttributesExpanded={isAttributesExpanded}
                    setIsAttributesExpanded={setIsAttributesExpanded}
                />
            </div>

            {/* 辦事清單 */}
            <ChecklistSection initialData={initialData} />

            <div className="border-t border-border-color"></div>

            {/* 進度日期 */}
            <MilestonesSection
                milestones={milestones}
                transferNote={transferNote}
                setTransferNote={setTransferNote}
            />

            {/* 與客戶約定時間 */}
            <AppointmentsSection milestones={milestones} />

            {/* 稅單限繳日期 */}
            <TaxDeadlinesSection initialData={initialData} financials={financials} />

            <div className="border-t border-border-color"></div>

            {/* 客製化的詳細排程管理 (Google Calendar Sync) */}
            <div className="py-4">
                <CaseScheduleManager caseId={initialData.id} />
            </div>

            <div className="border-t border-border-color"></div>

            {/* AI 訊息生成 (僅限管理員/特定人員) */}
            {currentUserEmail === 'tom890108159@gmail.com' && (
                <>
                    <div className="py-4">
                        <CaseMessageGenerator caseData={initialData} />
                    </div>
                    <div className="border-t border-border-color"></div>
                </>
            )}

            {/* 備註與狀態 */}
            <NotesSection
                notes={notes}
                setNotes={setNotes}
                status={initialData.status}
                pendingTasks={stripHtml(initialData.pending_tasks || '')}
                privateNotes={privateNotes}
                setPrivateNotes={setPrivateNotes}
                cancellationType={initialData.cancellation_type || ''}
            />

            {/* 日期更動紀錄 */}
            <AuditLogSection initialData={initialData} />

            {/* 表單操作按鈕 (儲存/刪除/取消) */}
            <FormActions
                loading={loading}
                showDeleteConfirm={showDeleteConfirm}
                setShowDeleteConfirm={setShowDeleteConfirm}
                performDelete={performDelete}
                saveStatus={saveStatus}
                lastSaved={lastSaved}
            />
        </form>
    );
}
