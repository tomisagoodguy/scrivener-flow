'use client';

import { useId } from 'react';
import type { HandoverFee, Scrivener } from '@/domain/handover-fee/types';
import { HANDOVER_FEE_FORM_ID, useHandoverFeeEdit } from './HandoverFeeEditContext';
import { ScrivenerSelect } from './ScrivenerSelect';
import { useHandoverFeeForm } from './useHandoverFeeForm';

const INPUT_CLASS = 'bg-white/50 backdrop-blur-sm border border-gray-200 focus:bg-white rounded-xl px-3 py-2 text-sm';
const LABEL_CLASS = 'text-[11px] font-black text-slate-500 dark:text-slate-400';

interface HandoverFeeFormProps {
    /** 使用中的地政士 */
    scriveners: Scrivener[];
    /** 伺服器算好的台北今天，避免 SSR/CSR 初值不同 */
    defaultDate?: string;
}

/** 以編輯中的紀錄 id 作為 key：切換編輯對象或回到新增模式時重新掛載，欄位初值隨之重設 */
export function HandoverFeeForm(props: HandoverFeeFormProps) {
    const { editing, cancelEdit } = useHandoverFeeEdit();
    return <FeeFormBody key={editing?.id ?? 'new'} {...props} editing={editing} onExitEdit={cancelEdit} />;
}

function FeeFormBody({
    scriveners,
    defaultDate,
    editing,
    onExitEdit,
}: HandoverFeeFormProps & { editing: HandoverFee | null; onExitEdit: () => void }) {
    const { fields, setters, swap, submit, error, isPending } = useHandoverFeeForm({
        activeIds: scriveners.map((s) => s.id),
        defaultDate,
        editing,
        onEditSaved: onExitEdit,
    });
    const ids = { date: useId(), object: useId(), amount: useId(), note: useId() };

    return (
        <form
            id={HANDOVER_FEE_FORM_ID}
            className="glass-card p-5 space-y-3"
            onSubmit={(e) => {
                e.preventDefault();
                submit();
            }}
        >
            <h2 className="text-sm font-black text-slate-700 dark:text-slate-200">{editing ? '編輯遞牌費' : '新增遞牌費'}</h2>
            {scriveners.length === 0 && (
                <p className="text-xs font-bold text-orange-600 dark:text-orange-400">名單是空的，請先新增地政士</p>
            )}

            <div className="grid grid-cols-2 md:grid-cols-[140px_1fr_1fr_auto_1fr_120px] gap-3 items-end">
                <div className="flex flex-col gap-1">
                    <label htmlFor={ids.date} className={LABEL_CLASS}>日期</label>
                    <input id={ids.date} type="date" value={fields.feeDate} onChange={(e) => setters.setFeeDate(e.target.value)} className={INPUT_CLASS} />
                </div>
                <div className="flex flex-col gap-1">
                    <label htmlFor={ids.object} className={LABEL_CLASS}>物件編號</label>
                    <input id={ids.object} value={fields.objectNumber} onChange={(e) => setters.setObjectNumber(e.target.value)} className={INPUT_CLASS} />
                </div>
                <ScrivenerSelect label="付款人" value={fields.payerId} onChange={setters.setPayerId} scriveners={scriveners} />
                <button
                    type="button"
                    onClick={swap}
                    aria-label="對調付款人與收款人"
                    className="self-end mb-1 px-2 py-1.5 text-lg text-slate-500 hover:text-blue-600 transition-colors"
                >
                    ⇄
                </button>
                <ScrivenerSelect label="收款人" value={fields.payeeId} onChange={setters.setPayeeId} scriveners={scriveners} />
                <div className="flex flex-col gap-1">
                    <label htmlFor={ids.amount} className={LABEL_CLASS}>金額</label>
                    <input
                        id={ids.amount}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        step={1}
                        value={fields.amount}
                        onChange={(e) => setters.setAmount(e.target.value)}
                        className={INPUT_CLASS}
                    />
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3 md:items-end">
                <div className="flex flex-col gap-1 flex-1">
                    <label htmlFor={ids.note} className={LABEL_CLASS}>備註</label>
                    <input id={ids.note} value={fields.note} onChange={(e) => setters.setNote(e.target.value)} className={INPUT_CLASS} />
                </div>
                {editing && (
                    <button type="button" onClick={onExitEdit} className="px-4 py-2 text-xs font-black text-slate-500 hover:text-slate-800">
                        取消編輯
                    </button>
                )}
                <button
                    type="submit"
                    disabled={isPending}
                    className="px-6 py-2 rounded-full bg-blue-600 text-white text-xs font-black shadow-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                    {editing ? '儲存修改' : '新增紀錄'}
                </button>
            </div>

            {error && (
                <p role="alert" className="text-xs font-bold text-red-600 dark:text-red-400">
                    {error}
                </p>
            )}
        </form>
    );
}
