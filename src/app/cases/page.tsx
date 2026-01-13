
import { Suspense } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { DemoCase } from '@/types';
import { Button } from '@/components/ui/button'; // Assuming these exist or will use standard HTML elements if not found, but shadcn is mentioned.
import { Input } from '@/components/ui/input';
import CaseCompactTodoList from '@/components/CaseCompactTodoList';
import ExcelStep from '@/components/ExcelStep';
import HighlightableValue from '@/components/HighlightableValue';

// Checking components folder first is safer.
import { Header } from '@/components/Header';
import CaseTodos from '@/components/CaseTodos';
import TimelineDashboard from '@/components/TimelineDashboard';
import GlobalPipelineChart from '@/components/GlobalPipelineChart';
import TimelineGanttView from '@/components/TimelineGanttView';
import ExportExcelButton from '@/components/ExportExcelButton';


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

    const activeStatus = statusParam === 'Closed' ? 'Closed' : 'Processing';

    // Build Query
    let query = supabase
        .from('cases')
        .select(`
      *,
      milestones (*),
      financials (*)
    `)
        // Default sort by created_at desc (newest first)
        .order('created_at', { ascending: false });

    if (activeStatus === 'Closed') {
        query = query.eq('status', 'Closed');
    } else if (statusParam === 'All') {
        // Show everything
    } else {
        // Show everything NOT closed for "Ongoing" by default
        query = query.neq('status', 'Closed').neq('status', 'Cancelled');
    }

    if (queryParam && typeof queryParam === 'string') {
        query = query.or(`case_number.ilike.%${queryParam}%,buyer_name.ilike.%${queryParam}%,seller_name.ilike.%${queryParam}%`);
    }

    const { data, error } = await query;

    const rawCases = (data || []) as unknown as DemoCase[];

    // Dashboard Data: STRICTLY processing cases only (No Closed, No Cancelled)
    const monitoringCases = rawCases.filter(c => c.status !== 'Closed' && c.status !== 'Cancelled');

    let cases = rawCases;

    // client-side sort helper
    const getNextActionDate = (c: DemoCase) => {
        const m = Array.isArray(c.milestones) ? c.milestones[0] : c.milestones;
        if (!m) return 9999999999999;
        const now = new Date().getTime();
        const dates = [m.contract_date, m.seal_date, m.tax_payment_date, m.transfer_date, m.handover_date]
            .filter(d => d) // filter undefined/null
            .map(d => new Date(d!).getTime())
            .filter(t => t >= now) // future only
            .sort((a, b) => a - b); // earliest future first
        return dates[0] || 9999999999999; // if no future date, push to end
    };

    // Filter by Stage (Client-side logic) AND Sort by Urgency
    if (stageParam && typeof stageParam === 'string') {
        cases = cases.filter(c => getCaseStage(c) === stageParam);
        // Sort filtered results by the earliest UPCOMING date (Urgency)
        cases.sort((a, b) => getNextActionDate(a) - getNextActionDate(b));
    }

    return (
        <div className="min-h-screen p-4 md:p-8 max-w-[1600px] mx-auto font-sans">
            <Header />

            <main className="mt-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <h1 className="text-3xl font-bold text-foreground">
                        案件管理
                    </h1>
                    <Link href="/cases/new">
                        <button className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm font-medium transition-colors">
                            + 新增案件
                        </button>
                    </Link>
                </div>

                {/* Tabs & Search */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <div className="flex space-x-1 p-1 bg-secondary/30 rounded-lg">
                        <Link href="/cases?status=Processing">
                            <button className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeStatus === 'Processing' && statusParam !== 'All' ? 'bg-primary text-white shadow-md' : 'text-foreground/60 hover:bg-secondary/50'}`}>
                                承辦中
                            </button>
                        </Link>
                        <Link href="/cases?status=Closed">
                            <button className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeStatus === 'Closed' ? 'bg-slate-600 text-white shadow-md' : 'text-foreground/60 hover:bg-secondary/50'}`}>
                                已結案
                            </button>
                        </Link>
                        <Link href="/cases?status=All">
                            <button className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${statusParam === 'All' ? 'bg-secondary text-foreground shadow-sm' : 'text-foreground/60 hover:bg-secondary/50'}`}>
                                全部
                            </button>
                        </Link>
                    </div>

                    <form className="relative w-full md:w-64">
                        {/* Simple search form using standard HTML for now to avoid client component complexity here */}
                        <input
                            type="text"
                            name="q"
                            placeholder="搜尋案號、買賣方..."
                            defaultValue={typeof queryParam === 'string' ? queryParam : ''}
                            className="w-full bg-background border-2 border-primary/30 rounded-full px-4 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                        />
                        <input type="hidden" name="status" value={activeStatus} />
                    </form>
                </div>

                {/* High Level Monitoring - Only Show if we have monitoring cases (Active) or forcing display for layout consistency, but usually hiding relevant info */}
                {statusParam !== 'Closed' && (
                    <>
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
                            <GlobalPipelineChart cases={monitoringCases} currentStage={typeof stageParam === 'string' ? stageParam : undefined} />
                            <TimelineDashboard cases={monitoringCases} />
                        </div>
                        {/* Vertical Timeline Monitoring */}
                        <TimelineGanttView cases={monitoringCases} />
                    </>
                )}

                {/* Case List */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-black text-foreground flex items-center gap-2">
                        <span className="text-2xl">📋</span> 詳細清單 (Case Spreadsheet)
                    </h2>
                    <div className="flex items-center gap-3">
                        <ExportExcelButton cases={cases} />
                        <span className="text-xs font-bold text-foreground/40">總計 {cases.length} 案</span>
                    </div>
                </div>
                {/* Case Grid (Excel Style) */}
                <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
                    <div className="overflow-x-auto overflow-y-auto max-h-[75vh]">
                        <table className="w-full text-left border-collapse table-fixed">
                            <thead>
                                <tr className="bg-secondary sticky top-0 z-10">
                                    <th className="px-1 py-2 text-[13px] font-black border border-border text-foreground w-[85px] text-center">案號</th>
                                    <th className="px-1 py-2 text-[13px] font-black border border-border text-foreground w-[50px] text-center">地區</th>
                                    <th className="px-1 py-2 text-[13px] font-black border border-border text-foreground w-[65px] text-center">買方</th>
                                    <th className="px-1 py-2 text-[13px] font-black border border-border text-foreground w-[65px] text-center">賣方</th>
                                    <th className="px-1 py-2 text-[13px] font-black border border-border text-foreground w-[110px] text-center">價格/銀行/塗銷</th>
                                    <th className="px-1 py-2 text-[13px] font-black border border-border text-foreground w-[60px] text-center">稅單</th>
                                    <th className="px-1 py-2 text-[13px] font-black border border-border text-foreground w-[260px] text-center">簽 &gt; 印 &gt; 稅 &gt; 過 &gt; 交</th>
                                    <th className="px-1 py-2 text-[13px] font-black border border-border text-foreground min-w-[200px]">未完成事項</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/20">
                                {cases.length === 0 && !error ? (
                                    <tr>
                                        <td colSpan={9} className="text-center py-20 text-foreground/40 bg-secondary/10">
                                            目前沒有{statusParam === 'All' ? '' : (activeStatus === 'Closed' ? '結案' : '承辦中')}的案件
                                        </td>
                                    </tr>
                                ) : (
                                    cases.map((c) => (
                                        <CaseRow key={c.id} caseData={c} />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}


import OvertimeButton from '@/components/OvertimeButton';

// Helper for display
const LabelValue = ({ label, value, subValue, className = '', horizontal = false }: { label: string; value: React.ReactNode; subValue?: string; className?: string; horizontal?: boolean }) => (
    <div className={`flex ${horizontal ? 'flex-row items-center gap-2 justify-between' : 'flex-col'} ${className}`}>
        <span className="text-[10px] text-foreground/40 font-extrabold uppercase tracking-tight">{label}</span>
        <div className="flex flex-col items-start">
            <span className="font-bold text-sm text-foreground leading-tight">{value || '-'}</span>
            {subValue && <span className="text-[10px] text-foreground/60 font-medium bg-secondary/50 px-1 py-0.5 rounded mt-0.5 border border-border-color">{subValue}</span>}
        </div>
    </div>
);

function CaseRow({ caseData }: { caseData: DemoCase }) {
    const milestones = Array.isArray(caseData.milestones) ? caseData.milestones[0] : caseData.milestones;
    const financials = Array.isArray(caseData.financials) ? caseData.financials[0] : caseData.financials;

    const SIGNING_TODOS = ['買方蓋印章', '賣方蓋印章', '用印款', '完稅款', '權狀印鑑', '授權', '解約排除', '規費', '設定', '稅單', '差額', '整過戶'];
    const TRANSFER_TODOS = ['整交屋', '實登', '打單', '履保', '水電', '稅費分算', '保單', '代償', '塗銷', '二撥'];

    const allTasks = [...SIGNING_TODOS, ...TRANSFER_TODOS];

    return (
        <tr className="hover:bg-primary/5 transition-colors group border-b border-border">
            <td className="px-0.5 py-1.5 border-x border-border md:w-[85px]">
                <Link href={`/cases/${caseData.id}`} className="block font-black text-[13px] text-primary hover:text-primary-deep text-center">
                    {caseData.case_number}
                </Link>
            </td>
            <td className="px-0.5 py-1.5 border-x border-border md:w-[50px]">
                <div className="text-[12px] text-foreground font-bold text-center whitespace-normal leading-tight">{caseData.district || caseData.city}</div>
            </td>
            <td className="px-0.5 py-1.5 border-x border-border md:w-[65px]">
                <div className="text-[12px] font-black text-foreground text-center whitespace-normal leading-tight" title={caseData.buyer_name || ''}>{caseData.buyer_name}</div>
            </td>
            <td className="px-0.5 py-1.5 border-x border-border md:w-[65px]">
                <div className="text-[12px] font-black text-foreground text-center whitespace-normal leading-tight" title={caseData.seller_name || ''}>{caseData.seller_name}</div>
            </td>
            <td className="px-1 py-1 border-x border-border md:w-[110px]">
                <div className="flex flex-col gap-0.5">
                    {financials?.total_price && (
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-foreground/50 scale-90 origin-left">總價</span>
                            <span className="text-[11px] font-black text-emerald-600">{financials.total_price} 萬</span>
                        </div>
                    )}
                    {financials?.buyer_bank && (
                        <div className="flex items-center justify-between border-t border-dashed border-border/50 pt-0.5">
                            <span className="text-[10px] text-foreground/50 scale-90 origin-left">貸</span>
                            <span className="text-[10px] font-bold text-blue-600 truncate max-w-[60px]" title={financials.buyer_bank}>{financials.buyer_bank}</span>
                        </div>
                    )}
                    {financials?.seller_bank && (
                        <div className="flex items-center justify-between border-t border-dashed border-border/50 pt-0.5">
                            <span className="text-[10px] text-foreground/50 scale-90 origin-left">償</span>
                            <span className="text-[10px] font-bold text-orange-600 truncate max-w-[60px]" title={financials.seller_bank}>{financials.seller_bank}</span>
                        </div>
                    )}
                    {caseData.cancellation_type && caseData.cancellation_type !== '無' && (
                        <div className="flex items-center justify-between border-t border-dashed border-border/50 pt-0.5">
                            <span className="text-[10px] text-foreground/50 scale-90 origin-left">塗</span>
                            <span className="text-[10px] font-bold text-purple-600 truncate max-w-[60px]" title={caseData.cancellation_type}>{caseData.cancellation_type}</span>
                        </div>
                    )}
                </div>
            </td>
            <td className="px-0.5 py-1.5 border-x border-border text-center md:w-[60px]">
                <div className="flex flex-col gap-1 items-center">
                    <div className="text-[11px] font-black text-foreground/80 border border-border rounded bg-background/50 px-0.5 py-0.5 shadow-sm truncate w-full">
                        {caseData.tax_type || '一般'}
                    </div>
                    {financials?.pre_collected_fee && (
                        <HighlightableValue
                            caseId={caseData.id}
                            fieldKey="pre_collected_fee"
                            value={`${financials.pre_collected_fee / 10000} 萬`}
                            defaultClassName="text-[10px] font-bold text-emerald-600 bg-emerald-50 rounded px-1 py-0.5 w-full border border-emerald-100"
                        />
                    )}
                </div>
            </td>
            <td className="px-0 py-0 border-x border-border w-[260px]">
                <div className="flex items-center justify-between gap-0 h-full min-h-[45px]">
                    <ExcelStep label="簽" date={milestones?.contract_date} caseId={caseData.id} />
                    <ExcelStep label="印" date={milestones?.seal_date} caseId={caseData.id} />
                    <ExcelStep label="稅" date={milestones?.tax_payment_date} caseId={caseData.id} />
                    <ExcelStep label="過" date={milestones?.transfer_date} note={milestones?.transfer_note} caseId={caseData.id} />
                    <ExcelStep label="交" date={milestones?.handover_date} caseId={caseData.id} />
                </div>
            </td>
            <td className="px-2 py-1.5 border-x border-border min-w-[500px]">
                <CaseCompactTodoList
                    caseId={caseData.id}
                    todos={caseData.todos as Record<string, boolean>}
                    allTasks={allTasks}
                    hideCompleted={true}
                />
                {caseData.pending_tasks && (
                    <div className="text-[11px] text-zinc-500 font-bold mt-1.5 w-full flex items-start gap-2 border-t border-zinc-200 pt-1">
                        <span className="bg-zinc-200 text-zinc-600 px-1 rounded-sm text-[10px] whitespace-nowrap mt-0.5">📝 備忘</span>
                        <span className="whitespace-pre-line leading-tight">{caseData.pending_tasks}</span>
                    </div>
                )}
                {caseData.notes && (
                    <div className="text-[11px] text-red-500 font-bold mt-1.5 w-full flex items-center gap-2 border-t border-red-500/10 pt-1 bg-red-500/5 p-1 rounded-sm">
                        <span className="bg-red-600 text-white px-1 rounded-sm text-[10px] whitespace-nowrap">⚠️ 警示</span>
                        <span className="truncate">{caseData.notes}</span>
                    </div>
                )}
            </td>
        </tr >
    );
}

const TimelineStep = ({ label, date, note }: { label: string; date?: string; note?: string }) => {
    const isCompleted = !!date;
    const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' }) : '';

    return (
        <div className="flex flex-col items-center min-w-[55px]">
            <span className={`text-[9px] font-black px-1 rounded-sm mb-1 ${isCompleted ? 'bg-primary text-white' : 'bg-secondary text-foreground/30'}`}>{label}</span>
            <span className={`text-[10px] font-mono ${isCompleted ? 'text-foreground' : 'text-foreground/20'}`}>{isCompleted ? formatDate(date) : '--'}</span>
            {note && <div className="text-[8px] bg-red-500 text-white px-1 rounded animate-pulse absolute mt-8">{note}</div>}
        </div>
    );
};
