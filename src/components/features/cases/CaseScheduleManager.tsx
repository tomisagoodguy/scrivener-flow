'use client';

import React from 'react';
import { useCaseSchedule } from './case-schedule/useCaseSchedule';
import { ScheduleInput } from './case-schedule/ScheduleInput';
import { ScheduleFilter } from './case-schedule/ScheduleFilter';
import { ScheduleList } from './case-schedule/ScheduleList';

interface CaseScheduleManagerProps {
    caseId: string;
}

export default function CaseScheduleManager({ caseId }: CaseScheduleManagerProps) {
    const {
        filteredItems,
        loading,
        filter,
        setFilter,
        date, setDate,
        time, setTime,
        content, setContent,
        isSubmitting,
        handleAdd,
        editingId,
        editDate, setEditDate,
        editTime, setEditTime,
        editContent, setEditContent,
        startEdit,
        cancelEdit,
        saveEdit,
        handleDelete
    } = useCaseSchedule(caseId);

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-black text-indigo-600 dark:!text-white flex items-center gap-3">
                <span className="p-2 bg-indigo-50 rounded-lg text-indigo-600">📅</span>
                案件行事曆與備忘 (Schedule)
            </h3>

            <ScheduleInput
                date={date} setDate={setDate}
                time={time} setTime={setTime}
                content={content} setContent={setContent}
                isSubmitting={isSubmitting}
                handleAdd={handleAdd}
            />

            <ScheduleFilter
                filter={filter}
                setFilter={setFilter}
                totalCount={filteredItems.length}
            />

            <ScheduleList
                items={filteredItems}
                loading={loading}
                filter={filter}
                editingId={editingId}
                editDate={editDate}
                setEditDate={setEditDate}
                editTime={editTime}
                setEditTime={setEditTime}
                editContent={editContent}
                setEditContent={setEditContent}
                saveEdit={saveEdit}
                cancelEdit={cancelEdit}
                startEdit={startEdit}
                handleDelete={handleDelete}
            />
        </div>
    );
}

