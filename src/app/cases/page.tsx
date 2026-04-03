import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { DemoCase } from '@/types';

import GlobalPipelineChart from '@/components/dashboard/GlobalPipelineChart';

import ExportExcelButton from '@/components/features/cases/ExportExcelButton';
import { CaseTableRow } from '@/components/features/cases/case-list/CaseTableRow';
import CaseMemoBoard from '@/components/features/cases/CaseMemoBoard';
import TimelineHub from '@/components/features/cases/timeline-hub/TimelineHub';

import { getCaseStage } from '@/lib/stageUtils';
import CasesPendingView from '@/components/features/cases/CasesPendingView';

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

    const supabase = await createClient();
    const activeStatus = statusParam === 'Closed' ? 'Closed' : 'Processing';

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
        .order('created_at', { ascending: false });

    if (user) {
        query = query.eq('user_id', user.id);
    }

    if (activeStatus === 'Closed') {
        query = query.eq('status', 'Closed');
    } else if (statusParam === 'All') {
        // Show everything
    } else {
        query = query.neq('status', 'Closed').neq('status', 'Cancelled');
    }

    if (queryParam && typeof queryParam === 'string') {
        query = query.or(
            `case_number.ilike.%${queryParam}%,buyer_name.ilike.%${queryParam}%,seller_name.ilike.%${queryParam}%,city.ilike.%${queryParam}%,district.ilike.%${queryParam}%,notes.ilike.%${queryParam}%`
        );
    }

    const { data, error } = await query;
    const rawCases = (data || []) as unknown as DemoCase[];
    const monitoringCases = rawCases.filter((c) => c.status !== 'Closed' && c.status !== 'Cancelled');

    let cases = rawCases;

    // Client-side sort helper
    const getNextActionDate = (c: DemoCase) => {
        const m = Array.isArray(c.milestones) ? c.milestones[0] : c.milestones;
        if (!m) return 9999999999999;
        const now = new Date().getTime();
        const dates = [m.contract_date, m.seal_date, m.tax_payment_date, m.transfer_date, m.handover_date]
            .filter((d) => d)
            .map((d) => new Date(d!).getTime())
            .filter((t) => t >= now)
            .sort((a, b) => a - b);
        return dates[0] || 9999999999999;
    };

    // Filter by Stage & Sort by Urgency
    if (stageParam && typeof stageParam === 'string') {
        cases = cases.filter((c) => getCaseStage(c) === stageParam);
        cases.sort((a, b) => getNextActionDate(a) - getNextActionDate(b));
    }

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

            {/* Header Section */}
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

            {/* Main Tabs & Search */}
            <div className="flex flex-col xl:flex-row gap-6 items-start xl:items-center justify-between">
                <div className="flex items-center gap-2 bg-slate-200/50 dark:bg-slate-800/50 p-1.5 rounded-[20px] border border-slate-200 dark:border-slate-800 backdrop-blur-sm">
                    {[
                        { label: '承辦中', value: 'Processing' },
                        { label: '已結案', value: 'Closed' },
                        { label: '📋 備忘錄', value: 'Memo' },
                        { label: '📅 時程', value: 'Timeline' },
                        { label: '⚠️ 未完成統整', value: 'Pending' },
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

            {/* Memo Board View */}
            {statusParam === 'Memo' && (
                <CaseMemoBoard cases={rawCases.filter((c) => c.status !== 'Closed' && c.status !== 'Cancelled')} />
            )}

            {/* Timeline Hub View */}
            {statusParam === 'Timeline' && (
                <TimelineHub cases={rawCases.filter((c) => c.status !== 'Closed' && c.status !== 'Cancelled')} />
            )}

            {/* Pending Items Aggregate View */}
            {statusParam === 'Pending' && (
                <CasesPendingView cases={rawCases.filter((c) => c.status !== 'Closed' && c.status !== 'Cancelled')} />
            )}

            {/* Monitoring View */}
            {statusParam !== 'Closed' && statusParam !== 'Memo' && statusParam !== 'Timeline' && statusParam !== 'Pending' && monitoringCases.length > 0 && (
                <div className="space-y-8">
                    <GlobalPipelineChart
                        cases={monitoringCases}
                        currentStage={typeof stageParam === 'string' ? stageParam : undefined}
                    />
                </div>
            )}

            {/* List Table */}
            {statusParam !== 'Memo' && statusParam !== 'Timeline' && statusParam !== 'Pending' && (
                <div className="glass-card overflow-hidden border-none shadow-2xl shadow-slate-200/50 dark:shadow-none">
                    <div className="overflow-x-auto">
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
            )}
        </div>
    );
}
