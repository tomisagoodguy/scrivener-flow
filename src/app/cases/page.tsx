import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { DemoCase } from '@/types';
import { computeIsOwnedByCurrentUser, resolveSharedByLabel, resolveSharedWithLabel } from '@/services/caseShareService';
import { listChatUsers } from '@/lib/chat/chatService';

import { CaseTableRow } from '@/components/features/cases/case-list/CaseTableRow';
import CaseMemoBoard from '@/components/features/cases/CaseMemoBoard';
import TimelineHub from '@/components/features/cases/timeline-hub/TimelineHub';

import { getCaseStage } from '@/lib/stageUtils';
import CasesPendingView from '@/components/features/cases/CasesPendingView';
import { CasesWidgetLayout } from '@/components/features/cases/CasesWidgetLayout';

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
    const viewParam = typeof resolvedSearchParams?.view === 'string' ? resolvedSearchParams.view : 'all';
    const sortParam = typeof resolvedSearchParams?.sort === 'string' ? resolvedSearchParams.sort : 'milestone';

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
      todos_list:todos(*),
      case_shares (shared_by, shared_with)
    `
        )
        .order('created_at', { ascending: false });

    // 不再硬編碼 user_id 過濾：RLS（含 case_shares 唯讀分享擴充）已負責過濾出
    // 「本人擁有」與「他人分享給本人」的案件，前端只需依 user_id 判斷來源標籤。

    if (activeStatus === 'Closed') {
        query = query.eq('status', 'Closed');
    } else if (statusParam === 'All') {
        // Show everything
    } else {
        query = query.neq('status', 'Closed').neq('status', 'Cancelled');
    }

    if (queryParam && typeof queryParam === 'string') {
        query = query.or(
            `case_number.ilike.%${queryParam}%,buyer_name.ilike.%${queryParam}%,seller_name.ilike.%${queryParam}%,city.ilike.%${queryParam}%,district.ilike.%${queryParam}%,notes.ilike.%${queryParam}%,chat_groups->>line.ilike.%${queryParam}%,chat_groups->>whatsapp.ilike.%${queryParam}%`
        );
    }

    const { data, error } = await query;
    const fetchedCases = (data || []) as unknown as DemoCase[];
    const hasAnyShare = fetchedCases.some((c) => (c.case_shares?.length ?? 0) > 0);
    const chatUsers = hasAnyShare ? await listChatUsers(supabase) : [];
    const rawCases = fetchedCases.map((c) => {
        const isOwnedByCurrentUser = computeIsOwnedByCurrentUser(c.user_id, user?.id ?? '');
        return {
            ...c,
            isOwnedByCurrentUser,
            sharedByName: !isOwnedByCurrentUser ? resolveSharedByLabel(c.case_shares?.[0]?.shared_by, chatUsers) : undefined,
            sharedWithLabel: isOwnedByCurrentUser
                ? resolveSharedWithLabel((c.case_shares ?? []).map((s) => s.shared_with), chatUsers)
                : undefined,
        };
    });
    const monitoringCases = rawCases.filter((c) => c.status !== 'Closed' && c.status !== 'Cancelled');

    let cases = rawCases;

    // Sort helper: 印→稅→過→交 priority (pick first upcoming)
    const getMilestoneSortKey = (c: DemoCase): number => {
        const m = Array.isArray(c.milestones) ? c.milestones[0] : c.milestones;
        if (!m) return 9999999999999;
        const now = new Date().getTime();
        for (const d of [m.seal_date, m.tax_payment_date, m.transfer_date, m.handover_date]) {
            if (d) {
                const t = new Date(d).getTime();
                if (t >= now) return t;
            }
        }
        return 9999999999999;
    };

    // Sort helper: single milestone field
    const getSingleMilestoneDateKey = (c: DemoCase, field: 'seal_date' | 'tax_payment_date' | 'transfer_date' | 'handover_date'): number => {
        const m = Array.isArray(c.milestones) ? c.milestones[0] : c.milestones;
        if (!m || !m[field]) return 9999999999999;
        return new Date(m[field]!).getTime();
    };

    // Filter by Stage
    if (stageParam && typeof stageParam === 'string') {
        cases = cases.filter((c) => getCaseStage(c) === stageParam);
    }

    // Apply sort
    if (sortParam === 'seal') {
        cases = [...cases].sort((a, b) => getSingleMilestoneDateKey(a, 'seal_date') - getSingleMilestoneDateKey(b, 'seal_date'));
    } else if (sortParam === 'tax') {
        cases = [...cases].sort((a, b) => getSingleMilestoneDateKey(a, 'tax_payment_date') - getSingleMilestoneDateKey(b, 'tax_payment_date'));
    } else if (sortParam === 'transfer') {
        cases = [...cases].sort((a, b) => getSingleMilestoneDateKey(a, 'transfer_date') - getSingleMilestoneDateKey(b, 'transfer_date'));
    } else if (sortParam === 'handover') {
        cases = [...cases].sort((a, b) => getSingleMilestoneDateKey(a, 'handover_date') - getSingleMilestoneDateKey(b, 'handover_date'));
    } else {
        // Default: 印→稅→過→交 priority
        cases = [...cases].sort((a, b) => getMilestoneSortKey(a) - getMilestoneSortKey(b));
    }

    // 二次穩定排序：被分享案件一律置頂，不影響同分區內原本的排序結果
    // （Array.prototype.sort 自 ES2019 起保證穩定，見 design.md「被分享案件在案件列表置頂排序」）
    cases = [...cases].sort((a, b) => (a.isOwnedByCurrentUser === false ? 0 : 1) - (b.isOwnedByCurrentUser === false ? 0 : 1));

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

            {/* 標題列 + 可自訂功能板塊：匯出按鈕、快速輸入列、快速導航、案件進度總覽、輕重緩急看板 */}
            <CasesWidgetLayout
                title="案件管理中心"
                caseCount={cases.length}
                cases={cases}
                monitoringCases={monitoringCases}
                rapidInputCases={rawCases.map((c) => ({
                    id: c.id,
                    case_number: c.case_number,
                    buyer_name: c.buyer_name,
                    seller_name: c.seller_name,
                }))}
                stageParam={typeof stageParam === 'string' ? stageParam : undefined}
                showMonitoringWidgets={
                    statusParam !== 'Closed' &&
                    statusParam !== 'Memo' &&
                    statusParam !== 'Timeline' &&
                    statusParam !== 'Pending' &&
                    monitoringCases.length > 0
                }
            >
                {/* Main Tabs & Search */}
                <div className="flex flex-col xl:flex-row gap-6 items-start xl:items-center justify-between">
                    <div className="flex items-center gap-2 bg-slate-200/50 dark:bg-slate-800/50 p-1.5 rounded-[20px] border border-slate-200 dark:border-slate-800 backdrop-blur-sm overflow-x-auto no-scrollbar shrink-0 max-w-full">
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
                        <input type="hidden" name="status" value={statusParam as string} />
                        {viewParam !== 'all' && <input type="hidden" name="view" value={viewParam} />}
                    </form>
                </div>
            </CasesWidgetLayout>

            {/* Memo Board View */}
            {statusParam === 'Memo' && (
                <CaseMemoBoard cases={rawCases.filter((c) => c.status !== 'Closed' && c.status !== 'Cancelled')} view={viewParam} />
            )}

            {/* Timeline Hub View */}
            {statusParam === 'Timeline' && (
                <TimelineHub cases={rawCases.filter((c) => c.status !== 'Closed' && c.status !== 'Cancelled')} />
            )}

            {/* Pending Items Aggregate View */}
            {statusParam === 'Pending' && (
                <CasesPendingView cases={rawCases.filter((c) => c.status !== 'Closed' && c.status !== 'Cancelled')} />
            )}

            {/* List Table */}
            {statusParam !== 'Memo' && statusParam !== 'Timeline' && statusParam !== 'Pending' && (
                <div className="glass-card overflow-hidden border-none shadow-2xl shadow-slate-200/50 dark:shadow-none">
                    <div className="flex items-center gap-2 px-4 pt-3 pb-1 flex-wrap">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">排序</span>
                        {([
                            { label: '印→稅→過→交', value: 'milestone' },
                            { label: '印', value: 'seal' },
                            { label: '稅', value: 'tax' },
                            { label: '過', value: 'transfer' },
                            { label: '交', value: 'handover' },
                        ] as const).map((opt) => {
                            const base = `/cases?status=${statusParam}${queryParam ? `&q=${queryParam}` : ''}${stageParam ? `&stage=${stageParam}` : ''}`;
                            const isActive = sortParam === opt.value || (opt.value === 'milestone' && sortParam !== 'seal' && sortParam !== 'tax' && sortParam !== 'transfer' && sortParam !== 'handover');
                            return (
                                <Link
                                    key={opt.value}
                                    href={`${base}&sort=${opt.value}`}
                                    className={`px-3 py-1 rounded-full text-[11px] font-black border transition-all ${
                                        isActive
                                            ? 'bg-blue-500 text-white border-blue-500 shadow-md'
                                            : 'bg-white/60 text-slate-500 border-slate-200 hover:border-blue-400 hover:text-blue-500 dark:bg-slate-800/60 dark:border-slate-700'
                                    }`}
                                >
                                    {opt.label}
                                </Link>
                            );
                        })}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-[1000px] w-full text-left border-collapse">
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
