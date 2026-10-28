'use client';

import { useState, useTransition } from 'react';
import { deleteHandoverFee, setHandoverFeePaid } from '@/app/actions/handoverFees';

/** 遞牌費列操作（已收 / 改回未收 / 刪除），失敗時保留錯誤訊息供畫面顯示 */
export function useFeeRowActions() {
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const run = (action: () => Promise<{ success: true } | { success: false; error: string }>) => {
        setError(null);
        startTransition(async () => {
            const result = await action();
            if (!result.success) setError(result.error);
        });
    };

    const setPaid = (id: string, paid: boolean) => run(() => setHandoverFeePaid(id, paid));

    const remove = (id: string, label: string) => {
        if (!confirm(`確定刪除「${label}」這筆遞牌費嗎？`)) return;
        run(() => deleteHandoverFee(id));
    };

    return { error, isPending, setPaid, remove };
}

export function formatAmount(amount: number): string {
    return `$${amount.toLocaleString('en-US')}`;
}
