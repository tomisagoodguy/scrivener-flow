'use client';

import { useState, useTransition } from 'react';
import { createHandoverFee } from '@/app/actions/handoverFees';
import { todayInTaipei } from '@/domain/handover-fee/agingUtils';
import { createHandoverFeeSchema } from '@/domain/handover-fee/types';

/** 新增遞牌費表單狀態；前端先以同一份 Zod schema 驗證，再交給 Server Action */
export function useHandoverFeeForm(activeIds: string[], defaultDate?: string) {
    const [feeDate, setFeeDate] = useState(() => defaultDate ?? todayInTaipei());
    const [objectNumber, setObjectNumber] = useState('');
    const [rawPayerId, setPayerId] = useState('');
    const [rawPayeeId, setPayeeId] = useState('');
    // 已選的地政士若被隱藏（不在使用中名單），視為未選，避免畫面顯示「請選擇」卻送出舊 id
    const payerId = activeIds.includes(rawPayerId) ? rawPayerId : '';
    const payeeId = activeIds.includes(rawPayeeId) ? rawPayeeId : '';
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
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
            const result = await createHandoverFee(input);
            if (!result.success) {
                setError(result.error);
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
