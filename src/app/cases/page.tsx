import { Suspense } from 'react';
import Link from 'next/link';
// Use the Server Client for authenticated requests in Server Components
import { createClient } from '@/lib/supabase/server';
import { DemoCase } from '@/types';

import CaseCompactTodoList from '@/components/features/cases/CaseCompactTodoList';
import ExcelStep from '@/components/shared/ExcelStep';
import HighlightableValue from '@/components/shared/HighlightableValue';

// Checking components folder first is safer.
import Header from '@/components/layout/Header';
import CaseTodos from '@/components/features/cases/CaseTodos';

import GlobalPipelineChart from '@/components/dashboard/GlobalPipelineChart';
import TimelineGanttView from '@/components/dashboard/TimelineGanttView';
import ExportExcelButton from '@/components/features/cases/ExportExcelButton';

import { getCaseStage } from '@/lib/stageUtils';

export const dynamic = 'force-dynamic';

export default async function CasesPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const resolvedSearchParams = await searchParams;
    const statusParam = resolvedSearchParams?.status || 'Processing';
    const queryParam = resolvedSearchParams?.q || '';
    const stageParam = resolvedSearchParams?.stage || '';

    // Initialize authenticated Supabase client
    const supabase = await createClient();

    const activeStatus = statusParam === 'Closed' ? 'Closed' : 'Processing';

    // Get current user for data isolation
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Build Query
    let query = supabase
        .from('cases')
        .select(
            `
      *,
      milestones (*),
      financials (*),
      todos_list:todos(*)
    `
        )
        // Default sort by created_at desc (newest first)
        .order('created_at', { ascending: false });

    // Force isolation: Only show cases belonging to current user
    if (user) {
        query = query.eq('user_id', user.id);
    }

    if (activeStatus === 'Closed') {
        query = query.eq('status', 'Closed');
    } else if (statusParam === 'All') {
        // Show everything
    } else {
        // Show everything NOT closed for "Ongoing" by default
        query = query.neq('status', 'Closed').neq('status', 'Cancelled');
    }

    if (queryParam && typeof queryParam === 'string') {
        query = query.or(
            `case_number.ilike.%${queryParam}%,buyer_name.ilike.%${queryParam}%,seller_name.ilike.%${queryParam}%,city.ilike.%${queryParam}%,district.ilike.%${queryParam}%,notes.ilike.%${queryParam}%`
        );
    }

    const { data, error } = await query;

    const rawCases = (data || []) as unknown as DemoCase[];

    // Dashboard Data: STRICTLY processing cases only (No Closed, No Cancelled)
    const monitoringCases = rawCases.filter((c) => c.status !== 'Closed' && c.status !== 'Cancelled');

    let cases = rawCases;

    // client-side sort helper
    const getNextActionDate = (c: DemoCase) => {
        const m = Array.isArray(c.milestones) ? c.milestones[0] : c.milestones;
        if (!m) return 9999999999999;
        const now = new Date().getTime();
        const dates = [m.contract_date, m.seal_date, m.tax_payment_date, m.transfer_date, m.handover_date]
            .filter((d) => d) // filter undefined/null
            .map((d) => new Date(d!).getTime())
            .filter((t) => t >= now) // future only
            .sort((a, b) => a - b); // earliest future first
        return dates[0] || 9999999999999; // if no future date, push to end
    };

    // Filter by Stage (Client-side logic) AND Sort by Urgency
    if (stageParam && typeof stageParam === 'string') {
        cases = cases.filter((c) => getCaseStage(c) === stageParam);
        // Sort filtered results by the earliest UPCOMING date (Urgency)
        cases.sort((a, b) => getNextActionDate(a) - getNextActionDate(b));
    }

    const activeCases = cases.filter((c) => c.status !== 'Closed' && c.status !== 'Cancelled');

    return (
        <div className="space-y-8 pb-20 animate-fade-in px-4 lg:px-0">
            {/* Context Navigation */}
            <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                <Link href="/" className="hover:text-blue-600 transition-colors">
                    DASHBOARD
                </Link>
                <span className="text-slate-300">/</span>
                <span className="text-slate-900 dark:text-slate-100 italic">CASE MANAGEMENT</span>
            </nav>

            {/* Header Section - Simplified */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">案件管理中心</h1>
                    <span className="text-xs font-bold bg-blue-500/10 text-blue-600 px-3 py-1 rounded-full border border-blue-500/20">
                        {cases.length} TOTAL
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <ExportExcelButton cases={cases} />
                </div>
            </div>

            {/* Main Tabs (Filters) & Search */}
            <div className="flex flex-col xl:flex-row gap-6 items-start xl:items-center justify-between">
                <div className="flex items-center gap-2 bg-slate-200/50 dark:bg-slate-800/50 p-1.5 rounded-[20px] border border-slate-200 dark:border-slate-800 backdrop-blur-sm">
                    {[
                        { label: '承辦中', value: 'Processing' },
                        { label: '已結案', value: 'Closed' },
                    ].map((tab) => (
                        <Link
                            key={tab.value}
                            href={`/cases?status=${tab.value}`}
                            className={`px-6 py-2.5 rounded-2xl text-xs font-black transition-all duration-300 ${statusParam === tab.value
                                ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xl shadow-slate-200/30 dark:shadow-none'
                                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                                }`}
                        >
                            {tab.label}
                        </Link>
                    ))}
                </div>

                <form className="relative w-full md:w-96 group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg grayscale group-focus-within:grayscale-0 transition-all">
                        🔍
                    </span>
                    <input
                        type="text"
                        name="q"
                        placeholder="搜尋案號、買賣方或備註..."
                        defaultValue={typeof queryParam === 'string' ? queryParam : ''}
                        className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-[20px] pl-12 pr-12 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden md:block">
                        <span className="text-[10px] font-black bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-400 border border-slate-200 dark:border-slate-600">
                            ENTER
                        </span>
                    </div>
                    <input type="hidden" name="status" value={activeStatus} />
                </form>
            </div>

            {/* Monitoring View (Active cases only) */}
            {statusParam !== 'Closed' && monitoringCases.length > 0 && (
                <div className="space-y-8">
                    <GlobalPipelineChart
                        cases={monitoringCases}
                        currentStage={typeof stageParam === 'string' ? stageParam : undefined}
                    />
                    <TimelineGanttView cases={monitoringCases} />
                </div>
            )}

            {/* List Table - Excel Style Restored */}
            <div className="glass-card overflow-hidden border-none shadow-2xl shadow-slate-200/50 dark:shadow-none">
                <div className="overflow-x-auto overflow-y-auto max-h-[75vh]">
                    <table className="w-full text-left border-collapse table-fixed">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-950/30 sticky top-0 z-10">
                                <th className="px-1 py-3 text-[12px] font-black border border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-tighter w-[85px] text-center">
                                    案號
                                </th>
                                <th className="px-1 py-3 text-[12px] font-black border border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-tighter w-[50px] text-center">
                                    地區
                                </th>
                                <th className="px-1 py-3 text-[12px] font-black border border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-tighter w-[65px] text-center">
                                    買方
                                </th>
                                <th className="px-1 py-3 text-[12px] font-black border border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-tighter w-[65px] text-center">
                                    賣方
                                </th>
                                <th className="px-1 py-3 text-[12px] font-black border border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-tighter w-[110px] text-center">
                                    價格/銀行/塗銷
                                </th>
                                <th className="px-1 py-3 text-[12px] font-black border border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-tighter w-[60px] text-center">
                                    稅單
                                </th>
                                <th className="px-1 py-3 text-[12px] font-black border border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-tighter w-[260px] text-center">
                                    {'簽 > 印 > 稅 > 過 > 交'}
                                </th>
                                <th className="px-1 py-3 text-[12px] font-black border border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-tighter min-w-[300px]">
                                    未完成事項 / 備註
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/30">
                            {cases.length === 0 && !error ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-32 text-slate-400 font-bold">
                                        目前沒有符合條件的案件資料
                                    </td>
                                </tr>
                            ) : (
                                cases.map((caseData) => <CaseTableRow key={caseData.id} caseData={caseData} />)
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function CaseTableRow({ caseData }: { caseData: DemoCase }) {
    const milestones = (caseData.milestones?.[0] || {}) as any; // Using any to bypass strict type check for safety during build
    const financials = (caseData.financials?.[0] || {}) as any; // Using any to bypass strict type check for safety during build

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

    const allTasks = [...SIGNING_TODOS, ...TRANSFER_TODOS];

    return (
        <tr className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors group">
            <td className="px-1 py-2 border border-slate-100 dark:border-slate-800">
                <Link
                    href={`/cases/${caseData.id}`}
                    className="block font-black text-[13px] text-blue-600 hover:text-blue-700 text-center"
                >
                    {caseData.case_number}
                </Link>
            </td>
            <td className="px-1 py-2 border border-slate-100 dark:border-slate-800">
                <div className="text-[12px] text-slate-900 dark:text-slate-100 font-bold text-center leading-tight whitespace-normal">
                    {caseData.district || caseData.city || '-'}
                </div>
            </td>
            <td className="px-1 py-2 border border-slate-100 dark:border-slate-800">
                <div
                    className="text-[12px] font-black text-slate-900 dark:text-slate-100 text-center leading-tight whitespace-normal truncate"
                    title={caseData.buyer_name}
                >
                    {caseData.buyer_name}
                </div>
            </td>
            <td className="px-1 py-2 border border-slate-100 dark:border-slate-800">
                <div
                    className="text-[12px] font-black text-slate-900 dark:text-slate-100 text-center leading-tight whitespace-normal truncate"
                    title={caseData.seller_name}
                >
                    {caseData.seller_name}
                </div>
            </td>
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
                        {caseData.notes && (
                            <div className="flex items-start gap-1.5">
                                <span className="bg-rose-500/10 text-rose-500 text-[9px] px-1 rounded">⚠️</span>
                                <p className="text-[10px] text-rose-600 dark:text-rose-400 leading-tight font-bold whitespace-pre-wrap">
                                    {caseData.notes}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </td>
        </tr>
    );
}

const TimelineStep = ({ label, date, note }: { label: string; date?: string; note?: string }) => {
    const isCompleted = !!date;
    const formatDate = (d?: string) =>
        d ? new Date(d).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' }) : '';

    return (
        <div className="flex flex-col items-center min-w-[55px]">
            <span
                className={`text-[9px] font-black px-1 rounded-sm mb-1 ${isCompleted ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600'}`}
            >
                {label}
            </span>
            <span
                className={`text-[10px] font-mono ${isCompleted ? 'text-slate-900 dark:text-slate-100' : 'text-slate-300 dark:text-slate-700'}`}
            >
                {isCompleted ? formatDate(date) : '--'}
            </span>
            {note && <div className="text-[8px] bg-red-500 text-white px-1 rounded absolute mt-8">{note}</div>}
        </div>
    );
};
