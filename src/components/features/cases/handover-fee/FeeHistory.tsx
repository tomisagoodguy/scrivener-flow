'use client';

import { useId } from 'react';
import { useRouter } from 'next/navigation';
import type { HandoverFeeWithNames, Scrivener } from '@/domain/handover-fee/types';
import { ScrivenerRoster } from './ScrivenerRoster';
import { formatAmount, useFeeRowActions } from './useFeeRowActions';

const INPUT_CLASS = 'bg-white/50 backdrop-blur-sm border border-gray-200 focus:bg-white rounded-xl px-3 py-1.5 text-sm';

interface FeeHistoryProps {
    fees: HandoverFeeWithNames[];
    /** 完整名單（含已隱藏），篩選選項只列使用中的 */
    scriveners: Scrivener[];
    month: string;
    scrivenerId: string;
}

function buildHref(month: string, scrivenerId: string): string {
    return `/cases?status=HandoverFee&month=${month}${scrivenerId ? `&scrivener=${scrivenerId}` : ''}`;
}

export function FeeHistory({ fees, scriveners, month, scrivenerId }: FeeHistoryProps) {
    const router = useRouter();
    const { error, isPending, setPaid, remove } = useFeeRowActions();
    const ids = { month: useId(), scrivener: useId() };
    const active = scriveners.filter((s) => !s.archived_at);

    return (
        <section className="glass-card p-5 space-y-3">
            <div className="flex flex-wrap items-end gap-3">
                <h2 className="text-sm font-black text-slate-700 dark:text-slate-200 mr-auto">歷史紀錄</h2>
                <label htmlFor={ids.month} className="text-[11px] font-black text-slate-500 dark:text-slate-400">月份</label>
                <input
                    id={ids.month}
                    type="month"
                    value={month}
                    onChange={(e) => e.target.value && router.push(buildHref(e.target.value, scrivenerId))}
                    className={INPUT_CLASS}
                />
                <label htmlFor={ids.scrivener} className="text-[11px] font-black text-slate-500 dark:text-slate-400">地政士篩選</label>
                <select
                    id={ids.scrivener}
                    value={scrivenerId}
                    onChange={(e) => router.push(buildHref(month, e.target.value))}
                    className={INPUT_CLASS}
                >
                    <option value="">全部</option>
                    {active.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
            </div>

            {error && (
                <p role="alert" className="text-xs font-bold text-red-600 dark:text-red-400">{error}</p>
            )}

            {fees.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">這個月沒有紀錄</p>
            ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {fees.map((fee) => (
                        <li key={fee.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 w-20">{fee.fee_date}</span>
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{fee.object_number}</span>
                            <span className="text-sm text-slate-600 dark:text-slate-300">{fee.payer_name} → {fee.payee_name}</span>
                            <span className="text-sm font-black text-slate-800 dark:text-slate-100">{formatAmount(fee.amount)}</span>
                            <span className={`text-[11px] font-black ${fee.paid_at ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
                                {fee.paid_at ? '已收' : '未收'}
                            </span>
                            {fee.note && <span className="text-xs text-slate-400 truncate max-w-[200px]">{fee.note}</span>}
                            <span className="ml-auto flex gap-2">
                                <button
                                    type="button"
                                    disabled={isPending}
                                    onClick={() => setPaid(fee.id, !fee.paid_at)}
                                    className="px-3 py-1 rounded-full text-[11px] font-black text-slate-500 hover:text-blue-600 disabled:opacity-50"
                                >
                                    {fee.paid_at ? '改回未收' : '標記已收'}
                                </button>
                                <button
                                    type="button"
                                    disabled={isPending}
                                    onClick={() => remove(fee.id, fee.object_number)}
                                    className="px-3 py-1 rounded-full text-[11px] font-black text-slate-400 hover:text-red-600 disabled:opacity-50"
                                >
                                    刪除
                                </button>
                            </span>
                        </li>
                    ))}
                </ul>
            )}

            <ScrivenerRoster scriveners={scriveners} />
        </section>
    );
}
