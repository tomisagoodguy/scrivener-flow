'use client';

import Link from 'next/link';
import { DemoCase } from '@/types';
import CaseCompactTodoList from '@/components/features/cases/CaseCompactTodoList';
import ExcelStep from '@/components/shared/ExcelStep';
import HighlightableValue from '@/components/shared/HighlightableValue';

interface CaseTableRowProps {
    caseData: DemoCase;
}

const SIGNING_TODOS = [
    '買方蓋印章',
    '賣方蓋印章',
    '用印款',
    '完稅款',
    '權狀印鑑',
    '授權',
    '解約排除',
    '規費',
    '設定',
    '稅單',
    '差額',
    '整過戶',
];

const TRANSFER_TODOS = ['整交屋', '實登', '打單', '履保', '水電', '稅費分算', '保單', '代償', '塗銷', '二撥'];

/**
 * 案件列表表格行組件
 * 顯示單一案件的詳細資訊（Excel 風格）
 */
export function CaseTableRow({ caseData }: CaseTableRowProps) {
    const milestones = (caseData.milestones?.[0] || {}) as any;
    const financials = (caseData.financials?.[0] || {}) as any;
    const allTasks = [...SIGNING_TODOS, ...TRANSFER_TODOS];

    return (
        <tr className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors group">
            {/* 案號 */}
            <td className="px-1 py-2 border border-slate-100 dark:border-slate-800">
                <Link
                    href={`/cases/${caseData.id}`}
                    className="block font-black text-[13px] text-blue-600 hover:text-blue-700 text-center"
                >
                    {caseData.case_number}
                </Link>
            </td>

            {/* 地區 */}
            <td className="px-1 py-2 border border-slate-100 dark:border-slate-800">
                <div className="text-[12px] text-slate-900 dark:text-slate-100 font-bold text-center leading-tight whitespace-normal">
                    {caseData.district || caseData.city || '-'}
                </div>
            </td>

            {/* 買方 */}
            <td className="px-1 py-2 border border-slate-100 dark:border-slate-800">
                <div
                    className="text-[12px] font-black text-slate-900 dark:text-slate-100 text-center leading-tight whitespace-normal truncate"
                    title={caseData.buyer_name}
                >
                    {caseData.buyer_name}
                </div>
            </td>

            {/* 賣方 */}
            <td className="px-1 py-2 border border-slate-100 dark:border-slate-800">
                <div
                    className="text-[12px] font-black text-slate-900 dark:text-slate-100 text-center leading-tight whitespace-normal truncate"
                    title={caseData.seller_name}
                >
                    {caseData.seller_name}
                </div>
            </td>

            {/* 價格/銀行/塗銷 */}
            <td className="px-1 py-1 border border-slate-100 dark:border-slate-800">
                <div className="flex flex-col gap-0.5">
                    {(financials.total_price || financials.contract_amount) && (
                        <div className="flex items-center justify-between px-0.5">
                            <span className="text-[9px] text-slate-400">總</span>
                            <span className="text-[11px] font-black text-emerald-600">
                                {financials.total_price || financials.contract_amount}萬
                            </span>
                        </div>
                    )}
                    {financials.buyer_bank && (
                        <div className="flex items-center justify-between border-t border-slate-100/50 dark:border-slate-700/50 pt-0.5 px-0.5">
                            <span className="text-[9px] text-slate-400">買</span>
                            <span
                                className="text-[10px] font-bold text-blue-600 truncate max-w-[60px]"
                                title={financials.buyer_bank}
                            >
                                {financials.buyer_bank}
                            </span>
                        </div>
                    )}
                    {financials.seller_bank && (
                        <div className="flex items-center justify-between border-t border-slate-100/50 dark:border-slate-700/50 pt-0.5 px-0.5">
                            <span className="text-[9px] text-slate-400">賣</span>
                            <span
                                className="text-[10px] font-bold text-purple-600 truncate max-w-[60px]"
                                title={financials.seller_bank}
                            >
                                {financials.seller_bank}
                            </span>
                        </div>
                    )}
                    {caseData.cancellation_type && caseData.cancellation_type !== '無' && (
                        <div className="flex items-center justify-between border-t border-slate-100/50 dark:border-slate-700/50 pt-0.5 px-0.5">
                            <span className="text-[9px] text-slate-400">塗</span>
                            <span
                                className="text-[10px] font-bold text-slate-500 truncate max-w-[60px]"
                                title={caseData.cancellation_type}
                            >
                                {caseData.cancellation_type}
                            </span>
                        </div>
                    )}
                </div>
            </td>

            {/* 稅單 */}
            <td className="px-1 py-2 border border-slate-100 dark:border-slate-800 text-center">
                <div className="flex flex-col gap-1 items-center">
                    <HighlightableValue
                        value={caseData.tax_type || '一般'}
                        caseId={caseData.id}
                        fieldKey="tax_type"
                        defaultClassName="text-[11px] font-black text-slate-700 border border-slate-200 rounded bg-slate-50 px-1 py-0.5 shadow-sm w-full"
                    />
                    {financials.pre_collected_fee && (
                        <div className="mt-0.5">
                            <HighlightableValue
                                value={
                                    <div className="flex items-center gap-0.5 justify-center">
                                        <span className="text-[9px] text-slate-400">預</span>
                                        <span className="text-[10px] font-bold text-amber-600">
                                            {financials.pre_collected_fee >= 1000
                                                ? Number((financials.pre_collected_fee / 10000).toFixed(2))
                                                : financials.pre_collected_fee}
                                            萬
                                        </span>
                                    </div>
                                }
                                caseId={caseData.id}
                                fieldKey="pre_fee"
                                defaultClassName="px-1 rounded border border-transparent hover:border-slate-200 transition-all cursor-pointer"
                            />
                        </div>
                    )}
                </div>
            </td>

            {/* 簽 > 印 > 稅 > 過 > 交 */}
            <td className="px-0 py-0 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between gap-0 h-full min-h-[45px]">
                    <ExcelStep label="簽" date={milestones.contract_date} caseId={caseData.id} />
                    <ExcelStep label="印" date={milestones.seal_date} caseId={caseData.id} />
                    <ExcelStep label="稅" date={milestones.tax_payment_date} caseId={caseData.id} />
                    <ExcelStep
                        label="過"
                        date={milestones.transfer_date}
                        note={milestones.transfer_note}
                        caseId={caseData.id}
                    />
                    <ExcelStep label="交" date={milestones.handover_date} caseId={caseData.id} />
                </div>
            </td>

            {/* 未完成事項 / 備註 */}
            <td className="px-2 py-2 border border-slate-100 dark:border-slate-800">
                <CaseCompactTodoList
                    caseId={caseData.id}
                    todos={caseData.todos as Record<string, boolean>}
                    allTasks={allTasks}
                    hideCompleted={true}
                />
                {(caseData.pending_tasks || caseData.notes) && (
                    <div className="mt-2 space-y-1 border-t border-slate-100 dark:border-slate-800 pt-1.5">
                        {caseData.pending_tasks && (
                            <div className="flex items-start gap-1.5">
                                <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-[9px] px-1 rounded">
                                    📝
                                </span>
                                <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-tight italic">
                                    {caseData.pending_tasks}
                                </p>
                            </div>
                        )}
                        {caseData.notes && caseData.notes.replace(/\[\[ATTR:.*?\]\]/, '').trim() && (
                            <div className="flex items-start gap-1.5">
                                <span className="bg-rose-500/10 text-rose-500 text-[9px] px-1 rounded">⚠️</span>
                                <p className="text-[10px] text-rose-600 dark:text-rose-400 leading-tight font-bold whitespace-pre-wrap">
                                    {caseData.notes.replace(/\[\[ATTR:.*?\]\]/, '').trim()}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </td>
        </tr>
    );
}
