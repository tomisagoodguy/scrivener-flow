'use client';

import { ageInDays, agingLevel, type AgingLevel } from '@/domain/handover-fee/agingUtils';
import type { HandoverFeeWithNames } from '@/domain/handover-fee/types';
import { formatAmount, useFeeRowActions } from './useFeeRowActions';

const AGING_STYLE: Record<AgingLevel, { border: string; text: string }> = {
    none: { border: 'border-l-transparent', text: 'text-slate-400' },
    orange: { border: 'border-l-orange-400', text: 'text-orange-600 dark:text-orange-400' },
    red: { border: 'border-l-red-500', text: 'text-red-600 dark:text-red-400' },
};

function ageLabel(age: number): string {
    if (age < 0) return '未到';
    if (age === 0) return '今天';
    return `${age} 天`;
}

interface UnpaidFeeListProps {
    fees: HandoverFeeWithNames[];
    /** 台北時區今天 `YYYY-MM-DD` */
    today: string;
}

export function UnpaidFeeList({ fees, today }: UnpaidFeeListProps) {
    const { error, isPending, setPaid, remove } = useFeeRowActions();
    const total = fees.reduce((sum, f) => sum + f.amount, 0);

    return (
        <section className="glass-card p-5 space-y-3">
            <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-sm font-black text-slate-700 dark:text-slate-200">未收款</h2>
                {fees.length > 0 && (
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        未收 {fees.length} 筆，共 {formatAmount(total)}
                    </span>
                )}
            </div>

            {error && (
                <p role="alert" className="text-xs font-bold text-red-600 dark:text-red-400">
                    {error}
                </p>
            )}

            {fees.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">目前沒有未收的遞牌費</p>
            ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {fees.map((fee) => {
                        const age = ageInDays(fee.fee_date, today);
                        const level = agingLevel(age);
                        const style = AGING_STYLE[level];
                        return (
                            <li
                                key={fee.id}
                                data-aging={level}
                                className={`flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 pl-3 border-l-4 ${style.border}`}
                            >
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 w-20">{fee.fee_date}</span>
                                <span className={`text-[11px] font-black w-12 ${style.text}`}>{ageLabel(age)}</span>
                                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{fee.object_number}</span>
                                <span className="text-sm text-slate-600 dark:text-slate-300">
                                    {fee.payer_name} → {fee.payee_name}
                                </span>
                                <span className="text-sm font-black text-slate-800 dark:text-slate-100">{formatAmount(fee.amount)}</span>
                                {fee.note && <span className="text-xs text-slate-400 truncate max-w-[200px]">{fee.note}</span>}
                                <span className="ml-auto flex gap-2">
                                    <button
                                        type="button"
                                        disabled={isPending}
                                        onClick={() => setPaid(fee.id, true)}
                                        className="px-3 py-1 rounded-full text-[11px] font-black border border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white disabled:opacity-50 transition-colors"
                                    >
                                        已收
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isPending}
                                        onClick={() => remove(fee.id, fee.object_number)}
                                        className="px-3 py-1 rounded-full text-[11px] font-black text-slate-400 hover:text-red-600 disabled:opacity-50 transition-colors"
                                    >
                                        刪除
                                    </button>
                                </span>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}
