'use client';

import React, { useState } from 'react';
import { EyeOff } from 'lucide-react';
import { DASHBOARD_WIDGET_LABELS, type DashboardWidgetId } from '@/domain/dashboard/layoutTypes';

interface HiddenWidgetsMenuProps {
    hiddenWidgetIds: DashboardWidgetId[];
    onShow: (id: DashboardWidgetId) => void;
}

export function HiddenWidgetsMenu({ hiddenWidgetIds, onShow }: HiddenWidgetsMenuProps) {
    const [open, setOpen] = useState(false);

    if (hiddenWidgetIds.length === 0) return null;

    return (
        <div className="relative">
            <button
                type="button"
                aria-label={`已隱藏區塊（${hiddenWidgetIds.length}）`}
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                className="glass-card flex h-10 w-10 items-center justify-center rounded-full text-gray-500 shadow-sm hover:text-gray-900"
            >
                <EyeOff size={18} />
            </button>
            {open && (
                <div role="menu" className="glass-card absolute right-0 top-full z-40 mt-2 w-56 rounded-2xl p-2 shadow-lg">
                    {hiddenWidgetIds.map((id) => (
                        <button
                            key={id}
                            type="button"
                            role="menuitem"
                            onClick={() => {
                                onShow(id);
                                setOpen(false);
                            }}
                            className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                        >
                            {DASHBOARD_WIDGET_LABELS[id]}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
