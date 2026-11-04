'use client';

import { useState, useTransition } from 'react';
import { createSoloFee, updateSoloFee } from '@/app/actions/handoverFees';
import { todayInTaipei } from '@/domain/handover-fee/agingUtils';
import { createSoloFeeSchema, type SoloHandoverFee } from '@/domain/handover-fee/types';

const DEFAULT_CASE_COUNT = '1';

interface UseSoloFeeFormOptions {
    defaultDate?: string;
    /** 有值時為編輯模式，欄位以這筆紀錄為初值 */
    editing?: SoloHandoverFee | null;
    /** 編輯儲存成功後呼叫（回到新增模式） */
    onEditSaved?: () => void;
}

/** 新增/編輯自己遞牌表單狀態；前端先以同一份 Zod schema 驗證，再交給 Server Action */
export function useSoloFeeForm({ defaultDate, editing, onEditSaved }: UseSoloFeeFormOptions) {
    const [feeDate, setFeeDate] = useState(() => editing?.fee_date ?? defaultDate ?? todayInTaipei());
    const [objectNumber, setObjectNumber] = useState(editing?.object_number ?? '');
    const [caseCount, setCaseCount] = useState(editing ? String(editing.case_count) : DEFAULT_CASE_COUNT);
    const [amount, setAmount] = useState(editing?.amount != null ? String(editing.amount) : '');
    const [note, setNote] = useState(editing?.note ?? '');
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const submit = () => {
        const input = {
            fee_date: feeDate,
            object_number: objectNumber,
            case_count: caseCount.trim() === '' ? Number.NaN : Number(caseCount),
            amount: amount.trim() === '' ? null : Number(amount),
            note,
        };
        const parsed = createSoloFeeSchema.safeParse(input);
        if (!parsed.success) {
            setError(parsed.error.issues[0]?.message ?? '輸入資料錯誤');
            return;
        }

        setError(null);
        startTransition(async () => {
            const result = editing ? await updateSoloFee(editing.id, input) : await createSoloFee(input);
            if (!result.success) {
                setError(result.error);
                return;
            }
            if (editing) {
                onEditSaved?.();
                return;
            }
            setObjectNumber('');
            setCaseCount(DEFAULT_CASE_COUNT);
            setAmount('');
            setNote('');
        });
    };

    return {
        fields: { feeDate, objectNumber, caseCount, amount, note },
        setters: { setFeeDate, setObjectNumber, setCaseCount, setAmount, setNote },
        submit,
        error,
        isPending,
    };
}
