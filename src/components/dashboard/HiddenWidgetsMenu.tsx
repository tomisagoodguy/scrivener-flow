'use client';

import React, { useState } from 'react';
import { EyeOff } from 'lucide-react';

interface HiddenWidgetsMenuProps<T extends string> {
    hiddenWidgetIds: T[];
    onShow: (id: T) => void;
    labels: Record<T, string>;
    /** 選單展開方向：'below-left'（預設，向下貼齊按鈕右緣，往左展開，首頁儀表板用法）或 'right'（水平向右展開，不遮住按鈕下方內容） */
    placement?: 'below-left' | 'right';
}

export function HiddenWidgetsMenu<T extends string>({ hiddenWidgetIds, onShow, labels, placement = 'below-left' }: HiddenWidgetsMenuProps<T>) {
    const [open, setOpen] = useState(false);

    if (hiddenWidgetIds.length === 0) return null;

    const menuPositionClass = placement === 'right' ? 'left-full top-0 ml-2' : 'right-0 top-full mt-2';

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
                <div role="menu" className={`glass-card absolute z-50 ${menuPositionClass} w-56 rounded-2xl p-2 shadow-lg`}>
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
                            {labels[id]}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
