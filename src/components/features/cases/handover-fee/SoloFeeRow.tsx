import type { SoloHandoverFee } from '@/domain/handover-fee/types';
import { formatAmount } from './useFeeRowActions';

interface SoloFeeRowProps {
    fee: SoloHandoverFee;
    isPending: boolean;
    onEdit: () => void;
    onRemove: () => void;
}

/** 歷史清單的自己遞牌列：沒有收款狀態，只能編輯與刪除 */
export function SoloFeeRow({ fee, isPending, onEdit, onRemove }: SoloFeeRowProps) {
    return (
        <li className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 w-20">{fee.fee_date}</span>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{fee.object_number ?? '—'}</span>
            <span className="text-sm text-slate-600 dark:text-slate-300">自己遞牌</span>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{fee.case_count} 件</span>
            <span className="text-sm font-black text-slate-800 dark:text-slate-100">{fee.amount === null ? '—' : formatAmount(fee.amount)}</span>
            {fee.note && <span className="text-xs text-slate-400 truncate max-w-[200px]">{fee.note}</span>}
            <span className="ml-auto flex gap-2">
                <button
                    type="button"
                    onClick={onEdit}
                    className="px-3 py-1 rounded-full text-[11px] font-black text-slate-500 hover:text-blue-600"
                >
                    編輯
                </button>
                <button
                    type="button"
                    disabled={isPending}
                    onClick={onRemove}
                    className="px-3 py-1 rounded-full text-[11px] font-black text-slate-400 hover:text-red-600 disabled:opacity-50"
                >
                    刪除
                </button>
            </span>
        </li>
    );
}
