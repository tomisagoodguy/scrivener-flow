'use client';

import { useState, useTransition } from 'react';
import { createHandoverFee, updateHandoverFee } from '@/app/actions/handoverFees';
import { todayInTaipei } from '@/domain/handover-fee/agingUtils';
import { createHandoverFeeSchema, type HandoverFee } from '@/domain/handover-fee/types';

interface UseHandoverFeeFormOptions {
    /** 使用中地政士的 id */
    activeIds: string[];
    defaultDate?: string;
    /** 有值時為編輯模式，欄位以這筆紀錄為初值 */
    editing?: HandoverFee | null;
    /** 編輯儲存成功後呼叫（回到新增模式） */
    onEditSaved?: () => void;
}

/** 新增/編輯遞牌費表單狀態；前端先以同一份 Zod schema 驗證，再交給 Server Action */
export function useHandoverFeeForm({ activeIds, defaultDate, editing, onEditSaved }: UseHandoverFeeFormOptions) {
    const [feeDate, setFeeDate] = useState(() => editing?.fee_date ?? defaultDate ?? todayInTaipei());
    const [objectNumber, setObjectNumber] = useState(editing?.object_number ?? '');
    const [rawPayerId, setPayerId] = useState(editing?.payer_scrivener_id ?? '');
    const [rawPayeeId, setPayeeId] = useState(editing?.payee_scrivener_id ?? '');
    // 已選的地政士若被隱藏（不在使用中名單），視為未選，避免畫面顯示「請選擇」卻送出舊 id
    const payerId = activeIds.includes(rawPayerId) ? rawPayerId : '';
    const payeeId = activeIds.includes(rawPayeeId) ? rawPayeeId : '';
    const [amount, setAmount] = useState(editing ? String(editing.amount) : '');
    const [note, setNote] = useState(editing?.note ?? '');
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const swap = () => {
        setPayerId(payeeId);
        setPayeeId(payerId);
    };

    const submit = () => {
        const input = {
            fee_date: feeDate,
            object_number: objectNumber,
            payer_scrivener_id: payerId,
            payee_scrivener_id: payeeId,
            amount: amount.trim() === '' ? Number.NaN : Number(amount),
            note,
        };
        const parsed = createHandoverFeeSchema.safeParse(input);
        if (!parsed.success) {
            setError(parsed.error.issues[0]?.message ?? '輸入資料錯誤');
            return;
        }

        setError(null);
        startTransition(async () => {
            const result = editing ? await updateHandoverFee(editing.id, input) : await createHandoverFee(input);
            if (!result.success) {
                setError(result.error);
                return;
            }
            if (editing) {
                onEditSaved?.();
                return;
            }
            setObjectNumber('');
            setAmount('');
            setNote('');
        });
    };

    return {
        fields: { feeDate, objectNumber, payerId, payeeId, amount, note },
        setters: { setFeeDate, setObjectNumber, setPayerId, setPayeeId, setAmount, setNote },
        swap,
        submit,
        error,
        isPending,
    };
}
