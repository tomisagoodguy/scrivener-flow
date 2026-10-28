'use client';

import { useState, useTransition } from 'react';
import { archiveScrivener } from '@/app/actions/handoverFees';
import type { Scrivener } from '@/domain/handover-fee/types';

interface ScrivenerRosterProps {
    scriveners: Scrivener[];
}

/** 名單管理：隱藏使用中的地政士；已隱藏者在付款人/收款人選單重新新增同名即可還原 */
export function ScrivenerRoster({ scriveners }: ScrivenerRosterProps) {
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const active = scriveners.filter((s) => !s.archived_at);
    const hidden = scriveners.filter((s) => s.archived_at);

    const hide = (s: Scrivener) => {
        if (!confirm(`確定隱藏「${s.name}」嗎？舊紀錄仍會保留。`)) return;
        startTransition(async () => {
            const result = await archiveScrivener(s.id);
            setError(result.success ? null : result.error);
        });
    };

    return (
        <details className="text-xs">
            <summary className="cursor-pointer font-black text-slate-500 dark:text-slate-400">地政士名單管理</summary>
            <div className="flex flex-wrap gap-2 pt-2">
                {active.map((s) => (
                    <span key={s.id} className="inline-flex items-center gap-1 px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-full">
                        {s.name}
                        <button
                            type="button"
                            disabled={isPending}
                            aria-label={`隱藏 ${s.name}`}
                            onClick={() => hide(s)}
                            className="text-slate-400 hover:text-red-600 disabled:opacity-50"
                        >
                            ×
                        </button>
                    </span>
                ))}
            </div>
            {hidden.length > 0 && (
                <p className="pt-2 text-slate-400">
                    已隱藏：{hidden.map((s) => s.name).join('、')}（在選單新增同名即可還原）
                </p>
            )}
            {error && <p className="pt-2 font-bold text-red-600 dark:text-red-400">{error}</p>}
        </details>
    );
}
