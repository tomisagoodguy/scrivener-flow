'use client';

import { useId, useState, useTransition } from 'react';
import { addScrivener } from '@/app/actions/handoverFees';
import type { Scrivener } from '@/domain/handover-fee/types';

const ADD_OPTION = '__add__';

interface ScrivenerSelectProps {
    label: string;
    value: string;
    onChange: (id: string) => void;
    /** 只傳入使用中的地政士 */
    scriveners: Scrivener[];
}

/** 地政士下拉選單，最後一項「＋新增地政士」可就地新增 */
export function ScrivenerSelect({ label, value, onChange, scriveners }: ScrivenerSelectProps) {
    const selectId = useId();
    const inputId = useId();
    const [adding, setAdding] = useState(false);
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const handleSelect = (next: string) => {
        if (next === ADD_OPTION) {
            setAdding(true);
            return;
        }
        onChange(next);
    };

    const confirmAdd = () => {
        startTransition(async () => {
            const result = await addScrivener(name);
            if (!result.success) {
                setError(result.error);
                return;
            }
            setError(null);
            setName('');
            setAdding(false);
        });
    };

    return (
        <div className="flex flex-col gap-1">
            <label htmlFor={selectId} className="text-[11px] font-black text-slate-500 dark:text-slate-400">
                {label}
            </label>
            <select
                id={selectId}
                value={value}
                onChange={(e) => handleSelect(e.target.value)}
                className="bg-white/50 backdrop-blur-sm border border-gray-200 focus:bg-white rounded-xl px-3 py-2 text-sm"
            >
                <option value="">請選擇</option>
                {scriveners.map((s) => (
                    <option key={s.id} value={s.id}>
                        {s.name}
                    </option>
                ))}
                <option value={ADD_OPTION}>＋新增地政士</option>
            </select>
            {adding && (
                <div className="flex gap-1">
                    <label htmlFor={inputId} className="sr-only">
                        新地政士姓名
                    </label>
                    <input
                        id={inputId}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="姓名"
                        className="flex-1 min-w-0 bg-white/50 backdrop-blur-sm border border-gray-200 focus:bg-white rounded-xl px-2 py-1 text-sm"
                    />
                    <button
                        type="button"
                        disabled={isPending}
                        onClick={confirmAdd}
                        className="px-2 text-[11px] font-black text-blue-600 disabled:opacity-50"
                    >
                        加入名單
                    </button>
                    <button type="button" onClick={() => setAdding(false)} className="px-2 text-[11px] text-slate-400">
                        取消
                    </button>
                </div>
            )}
            {error && <p className="text-[11px] font-bold text-red-600 dark:text-red-400">{error}</p>}
        </div>
    );
}
