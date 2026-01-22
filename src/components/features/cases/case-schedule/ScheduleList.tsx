import React from 'react';
import { ScheduleItem, FilterType } from './types';
import { ScheduleItemCard } from './ScheduleItemCard';

interface ScheduleListProps {
    items: ScheduleItem[];
    loading: boolean;
    filter: FilterType;
    editingId: string | null;
    editDate: string;
    setEditDate: (val: string) => void;
    editTime: string;
    setEditTime: (val: string) => void;
    editContent: string;
    setEditContent: (val: string) => void;
    saveEdit: (id: string) => void;
    cancelEdit: () => void;
    startEdit: (item: ScheduleItem) => void;
    handleDelete: (id: string) => void;
}

export function ScheduleList({
    items,
    loading,
    filter,
    ...props
}: ScheduleListProps) {
    if (loading) {
        return <div className="text-center text-slate-400 text-sm py-4">載入中...</div>;
    }

    if (items.length === 0) {
        return (
            <div className="text-center text-slate-400 text-sm py-4 italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
                {filter === 'future' && '目前沒有未來的行程'}
                {filter === 'today' && '今天沒有安排行程'}
                {filter === 'expired' && '沒有已過期的提醒'}
                {filter === 'all' && '目前沒有安排特定行程'}
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {items.map((item) => (
                <ScheduleItemCard key={item.id} item={item} {...props} />
            ))}
        </div>
    );
}
