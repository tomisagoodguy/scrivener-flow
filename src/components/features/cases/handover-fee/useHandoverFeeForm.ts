'use client';

import { useState, useTransition } from 'react';
import { createHandoverFee } from '@/app/actions/handoverFees';
import { todayInTaipei } from '@/domain/handover-fee/agingUtils';
import { createHandoverFeeSchema } from '@/domain/handover-fee/types';

/** 新增遞牌費表單狀態；前端先以同一份 Zod schema 驗證，再交給 Server Action */
export function useHandoverFeeForm(defaultDate?: string) {
    const [feeDate, setFeeDate] = useState(() => defaultDate ?? todayInTaipei());
    const [objectNumber, setObjectNumber] = useState('');
    const [payerId, setPayerId] = useState('');
    const [payeeId, setPayeeId] = useState('');
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
