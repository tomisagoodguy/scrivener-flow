'use client';

import Link from 'next/link';
import { DemoCase } from '@/types';
import CaseCompactTodoList from '@/components/features/cases/CaseCompactTodoList';

const SIGNING_TODOS = [
    '買方蓋印章',
    '賣方蓋印章',
    '用印款',
    '完稅款',
    '權狀',
    '印鑑',
    '授權',
    '解約排除',
    '規費',
    '設定',
    '等稅單',
    '已繳稅單',
    '差額',
    '整過戶',
];

const TRANSFER_TODOS = ['整交屋', '實登', '打單', '履保', '水電', '稅費分算', '保單', '代償', '塗銷', '二撥'];

const ALL_TASKS = [
    ...SIGNING_TODOS.map((t) => `S_${t}`),
    ...TRANSFER_TODOS.map((t) => `T_${t}`),
];

const KNOWN_PREFIXES = ['SIG_', 'SEAL_', 'LOAN_', 'TAX_', 'HO_', 'S_', 'T_'];
const hasKnownPrefix = (key: string) => KNOWN_PREFIXES.some((p) => key.startsWith(p));

function getPendingCount(caseData: DemoCase): number {
    const todos = caseData.todos || {};
    const filteredTodos = { ...todos };
    delete (filteredTodos as Record<string, boolean>)['S_權狀印鑑'];
    delete (filteredTodos as Record<string, boolean>)['S_稅單'];

    const customTasks = Object.keys(filteredTodos).filter((t) => {
        if (!isNaN(Number(t))) return false;
        if (ALL_TASKS.includes(t)) return false;
        if (hasKnownPrefix(t)) return false;
        return true;
    });

    const allDisplayTasks = [...ALL_TASKS, ...customTasks];
    return allDisplayTasks.filter((task) => !filteredTodos[task]).length;
}

interface CasesPendingViewProps {
    cases: DemoCase[];
}

export default function CasesPendingView({ cases }: CasesPendingViewProps) {
    const casesWithPending = cases
        .map((c) => ({ ...c, pendingCount: getPendingCount(c) }))
        .sort((a, b) => b.pendingCount - a.pendingCount);

    const withPending = casesWithPending.filter((c) => c.pendingCount > 0);
    const allDone = casesWithPending.filter((c) => c.pendingCount === 0);

    return (
        <div className="space-y-4">
            {/* 統計摘要 */}
            <div className="flex items-center gap-4 flex-wrap">
                <div className="glass-card px-4 py-3 flex items-center gap-3 border-red-200/50">
                    <div className="text-2xl font-black text-red-600">{withPending.length}</div>
                    <div className="text-sm text-slate-500 font-medium">案件有未完成事項</div>
                </div>
                <div className="glass-card px-4 py-3 flex items-center gap-3 border-green-200/50">
                    <div className="text-2xl font-black text-green-600">{allDone.length}</div>
                    <div className="text-sm text-slate-500 font-medium">案件事項全部完成</div>
                </div>
                <div className="glass-card px-4 py-3 flex items-center gap-3">
                    <div className="text-2xl font-black text-amber-600">
                        {withPending.reduce((sum, c) => sum + c.pendingCount, 0)}
                    </div>
                    <div className="text-sm text-slate-500 font-medium">總未完成項目數</div>
                </div>
            </div>

            {/* 有未完成事項的案件 */}
            {withPending.length === 0 ? (
                <div className="glass-card p-16 text-center">
                    <div className="text-4xl mb-4">🎉</div>
                    <div className="text-lg font-black text-green-600">所有承辦中案件事項皆已完成！</div>
                </div>
            ) : (
                <div className="glass-card overflow-hidden border-none shadow-2xl shadow-slate-200/50 dark:shadow-none">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-950/30 sticky top-0 z-10">
                                    <th className="px-3 py-3 text-[12px] font-black border border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-tighter w-[90px] text-center">
                                        案號
                                    </th>
                                    <th className="px-3 py-3 text-[12px] font-black border border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-tighter w-[100px] text-center">
                                        買賣方
                                    </th>
                                    <th className="px-3 py-3 text-[12px] font-black border border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-tighter w-[50px] text-center">
                                        未完成
                                    </th>
                                    <th className="px-3 py-3 text-[12px] font-black border border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-tighter">
                                        待辦事項（點擊切換完成狀態）
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/30">
                                {withPending.map((caseData) => {
                                    const filteredTodos = { ...(caseData.todos || {}) };
                                    delete (filteredTodos as Record<string, boolean>)['S_權狀印鑑'];
                                    delete (filteredTodos as Record<string, boolean>)['S_稅單'];
                                    return (
                                        <tr
                                            key={caseData.id}
                                            className="hover:bg-red-50/30 dark:hover:bg-red-900/10 transition-colors"
                                        >
                                            {/* 案號 */}
                                            <td className="px-3 py-2 border border-slate-100 dark:border-slate-800 text-center align-top pt-3">
                                                <Link
                                                    href={`/cases/${caseData.id}`}
                                                    className="font-black text-[15px] text-blue-600 hover:text-blue-700"
                                                >
                                                    {caseData.case_number}
                                                </Link>
                                            </td>
                                            {/* 買賣方 */}
                                            <td className="px-3 py-2 border border-slate-100 dark:border-slate-800 align-top pt-3">
                                                <div className="text-[13px] font-bold text-slate-700 dark:text-slate-300 leading-tight">
                                                    {caseData.buyer_name}
                                                </div>
                                                <div className="text-[12px] text-slate-400 leading-tight mt-0.5">
                                                    {caseData.seller_name}
                                                </div>
                                            </td>
                                            {/* 未完成數 */}
                                            <td className="px-3 py-2 border border-slate-100 dark:border-slate-800 text-center align-top pt-3">
                                                <span className="inline-block bg-red-100 text-red-600 font-black text-sm px-2 py-0.5 rounded-full border border-red-200">
                                                    {caseData.pendingCount}
                                                </span>
                                            </td>
                                            {/* 待辦事項 */}
                                            <td className="px-3 py-2 border border-slate-100 dark:border-slate-800">
                                                <CaseCompactTodoList
                                                    caseId={caseData.id}
                                                    todos={filteredTodos as Record<string, boolean>}
                                                    allTasks={ALL_TASKS}
                                                    hideCompleted={true}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 已全部完成的案件 */}
            {allDone.length > 0 && (
                <details className="glass-card p-4">
                    <summary className="cursor-pointer text-sm font-bold text-green-600 select-none flex items-center gap-2">
                        <span>✅ 事項全部完成的案件</span>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
                            {allDone.length} 件
                        </span>
                    </summary>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {allDone.map((c) => (
                            <Link
                                key={c.id}
                                href={`/cases/${c.id}`}
                                className="px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 font-bold text-sm hover:bg-green-100 transition-colors"
                            >
                                {c.case_number}
                                <span className="ml-1.5 text-xs text-green-400 font-medium">
                                    {c.buyer_name}
                                </span>
                            </Link>
                        ))}
                    </div>
                </details>
            )}
        </div>
    );
}
