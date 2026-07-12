'use client';

import React from 'react';

interface CollapseToggleProps {
    collapsed: boolean;
    onToggle: () => void;
}

/**
 * 矩陣標題列的收合/展開按鈕（僅 collapsible=true 時渲染）。
 * 標題列整列也可點擊展開/收合，此按鈕點擊時需 stopPropagation 避免與列點擊互相抵銷。
 */
export default function CollapseToggle({ collapsed, onToggle }: CollapseToggleProps) {
    return (
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                onToggle();
            }}
            className="p-1 rounded-lg text-foreground/50 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            title={collapsed ? '展開矩陣' : '收合矩陣'}
        >
            <svg
                className={`w-4 h-4 transition-transform ${collapsed ? '' : 'rotate-180'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
        </button>
    );
}
