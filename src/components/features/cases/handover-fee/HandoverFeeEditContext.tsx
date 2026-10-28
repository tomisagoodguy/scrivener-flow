'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { HandoverFeeWithNames } from '@/domain/handover-fee/types';

interface HandoverFeeEditValue {
    /** 目前正在編輯的紀錄；null 表示表單為新增模式 */
    editing: HandoverFeeWithNames | null;
    startEdit: (fee: HandoverFeeWithNames) => void;
    cancelEdit: () => void;
}

const HandoverFeeEditContext = createContext<HandoverFeeEditValue | null>(null);

/** 串接清單的「編輯」按鈕與頁面上方的表單 */
export function HandoverFeeEditProvider({ children }: { children: ReactNode }) {
    const [editing, setEditing] = useState<HandoverFeeWithNames | null>(null);

    const startEdit = (fee: HandoverFeeWithNames) => {
        setEditing(fee);
        document.getElementById(HANDOVER_FEE_FORM_ID)?.scrollIntoView?.({ block: 'start', behavior: 'instant' });
    };

    return (
        <HandoverFeeEditContext.Provider value={{ editing, startEdit, cancelEdit: () => setEditing(null) }}>
            {children}
        </HandoverFeeEditContext.Provider>
    );
}

export function useHandoverFeeEdit(): HandoverFeeEditValue {
    const value = useContext(HandoverFeeEditContext);
    if (!value) throw new Error('useHandoverFeeEdit 必須在 HandoverFeeEditProvider 內使用');
    return value;
}

export const HANDOVER_FEE_FORM_ID = 'handover-fee-form';
