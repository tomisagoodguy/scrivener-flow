'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';
import type { DashboardWidgetId } from '@/domain/dashboard/layoutTypes';

interface DashboardWidgetShellProps {
    id: DashboardWidgetId;
    /** false 時不渲染拖曳把手與 X 按鈕（例如 welcome-header） */
    interactive?: boolean;
    onHide: () => void;
    children: React.ReactNode;
}

export function DashboardWidgetShell({ id, interactive = true, onHide, children }: DashboardWidgetShellProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id,
        disabled: !interactive,
    });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className={`relative group ${isDragging ? 'z-10 opacity-70' : ''}`}>
            {interactive && (
                <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                        type="button"
                        aria-label="拖曳調整順序"
                        className="cursor-grab rounded-md p-1 text-gray-400 hover:text-gray-600 active:cursor-grabbing"
                        {...attributes}
                        {...listeners}
                    >
                        <GripVertical size={16} />
                    </button>
                    <button
                        type="button"
                        aria-label="隱藏此區塊"
                        onClick={onHide}
                        className="rounded-md p-1 text-gray-400 hover:text-rose-600"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}
            {children}
        </div>
    );
}
