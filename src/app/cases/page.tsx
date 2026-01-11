
import { Suspense } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { DemoCase } from '@/types';
import { Button } from '@/components/ui/button'; // Assuming these exist or will use standard HTML elements if not found, but shadcn is mentioned.
import { Input } from '@/components/ui/input'; // Check existence later, or use standard input
// If shadcn components are not guaranteed, I'll use standard Tailwind HTML first to avoid unresolved imports.
// README says "Tailwind CSS + shadcn/ui". I'll assume standard shadcn paths or check components folder first.

// Checking components folder first is safer.
import { Header } from '@/components/Header';
import CaseTodos from '@/components/CaseTodos';
import TimelineDashboard from '@/components/TimelineDashboard';
import GlobalPipelineChart from '@/components/GlobalPipelineChart';
import TimelineGanttView from '@/components/TimelineGanttView';


export const dynamic = 'force-dynamic';

export default async function CasesPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>; // Next.js 15+ async searchParams
}) {
    const resolvedSearchParams = await searchParams;
    const statusParam = resolvedSearchParams?.status || 'Processing';
    const queryParam = resolvedSearchParams?.q || '';

    const activeStatus = statusParam === 'Closed' ? 'Closed' : 'Processing';

    // Build Query
    let query = supabase
        .from('cases')
        .select(`
      *,
      milestones (*),
      financials (*)
    `)
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

    const cases = (data || []) as unknown as DemoCase[];

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

                {/* High Level Monitoring */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
                    <GlobalPipelineChart cases={cases} />
                    <TimelineDashboard cases={cases} />
                </div>

                {/* Vertical Timeline Monitoring */}
                <TimelineGanttView cases={cases} />

                {/* Case List */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <span className="text-2xl">📋</span> 詳細清單 (Case Spreadsheet)
                    </h2>
                    <span className="text-xs font-bold text-slate-400">總計 {cases.length} 案</span>
                </div>
                {/* Case Grid (Excel Style) */}
                <div className="bg-white border border-slate-300 overflow-hidden shadow-sm shadow-slate-200">
                    <div className="overflow-x-auto overflow-y-auto max-h-[75vh]">
                        <table className="w-full text-left border-collapse table-fixed">
                            <thead>
                                <tr className="bg-slate-100 sticky top-0 z-10">
                                    <th className="px-3 py-2 text-[14px] font-black border border-slate-300 text-slate-800 w-32 bg-slate-200/50">案號</th>
                                    <th className="px-3 py-2 text-[14px] font-black border border-slate-300 text-slate-800 w-24 bg-slate-200/50">地區</th>
                                    <th className="px-3 py-2 text-[14px] font-black border border-slate-300 text-slate-800 w-32 bg-slate-200/50">買方</th>
                                    <th className="px-3 py-2 text-[14px] font-black border border-slate-300 text-slate-800 w-32 bg-slate-200/50">賣方</th>
                                    <th className="px-3 py-2 text-[14px] font-black border border-slate-300 text-slate-800 w-40 bg-slate-200/50 text-center">稅單性質</th>
                                    <th className="px-3 py-2 text-[14px] font-black border border-slate-300 text-slate-800 w-[550px] text-center bg-slate-200/50">簽 &gt; 印 &gt; 稅 &gt; 尾 &gt; 過 &gt; 交</th>
                                    <th className="px-3 py-2 text-[14px] font-black border border-slate-300 text-slate-800 min-w-[300px] bg-slate-200/50">未完成事項</th>
                                    <th className="px-3 py-2 text-[14px] font-black border border-slate-300 text-slate-800 w-28 text-center bg-slate-200/50">狀態</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {cases.length === 0 && !error ? (
                                    <tr>
                                        <td colSpan={8} className="text-center py-20 text-slate-500 bg-slate-50">
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

    const SIGNING_TODOS = ['買方蓋印章', '賣方蓋印章', '用印款', '完稅款', '權狀印鑑', '授權', '解約排除', '規費', '設定', '稅單', '差額', '整過戶'];
    const TRANSFER_TODOS = ['整交屋', '實登', '打單', '履保', '水電', '稅費分算', '保單'];

    const pendingTasks = [
        ...SIGNING_TODOS, ...TRANSFER_TODOS
    ].filter(item => !(caseData.todos?.[item]));

    return (
        <tr className="hover:bg-blue-50/70 transition-colors group cursor-pointer border-b border-slate-300">
            <td className="px-3 py-2.5 border-x border-slate-300">
                <Link href={`/cases/${caseData.id}`} className="block font-black text-[16px] text-blue-800 group-hover:text-blue-600 truncate">
                    {caseData.case_number}
                </Link>
            </td>
            <td className="px-3 py-2.5 border-x border-slate-300">
                <div className="text-[14px] text-slate-600 font-bold bg-slate-100 rounded px-1.5 py-0.5 text-center">{caseData.city}</div>
            </td>
            <td className="px-3 py-2.5 border-x border-slate-300">
                <div className="text-[16px] font-black text-slate-900 truncate">{caseData.buyer_name}</div>
            </td>
            <td className="px-3 py-2.5 border-x border-slate-300">
                <div className="text-[16px] font-black text-slate-800 truncate">{caseData.seller_name}</div>
            </td>
            <td className="px-3 py-2.5 border-x border-slate-300 text-center">
                <div className="text-[13px] font-black text-slate-700 border-2 border-slate-400 rounded bg-white px-2 py-1 shadow-sm">
                    {caseData.tax_type || '一般'}
                </div>
            </td>
            <td className="px-1 py-1 border-x border-slate-300">
                <div className="flex items-center justify-between gap-0 h-full min-h-[50px]">
                    <ExcelStep label="簽" date={milestones?.contract_date} />
                    <ExcelStep label="印" date={milestones?.seal_date} />
                    <ExcelStep label="稅" date={milestones?.tax_payment_date} />
                    <ExcelStep label="尾" date={milestones?.balance_payment_date} />
                    <ExcelStep label="過" date={milestones?.transfer_date} note={milestones?.transfer_note} />
                    <ExcelStep label="交" date={milestones?.handover_date} />
                </div>
            </td>
            <td className="px-3 py-2.5 border-x border-slate-300">
                <div className="flex flex-wrap gap-1">
                    {pendingTasks.slice(0, 10).map(task => (
                        <span key={task} className="text-[12px] font-bold bg-red-50 text-red-600 px-2 py-0.5 border border-red-200 rounded whitespace-nowrap">
                            {task}
                        </span>
                    ))}
                    {pendingTasks.length > 10 && (
                        <span className="text-[12px] text-slate-400 font-black">+{pendingTasks.length - 10}</span>
                    )}
                    {caseData.notes && (
                        <div className="text-[13px] text-red-700 font-black mt-2 w-full flex items-center gap-2 border-t-2 border-red-100 pt-1.5 bg-red-50/30 p-1">
                            <span className="bg-red-600 text-white px-1.5 rounded-sm text-[11px]">⚠️ 警示</span>
                            <span>{caseData.notes}</span>
                        </div>
                    )}
                </div>
            </td>
            <td className="px-3 py-2.5 border-x border-slate-300 text-center">
                <span className={`text-[13px] font-black px-2.5 py-1 rounded border-2 ${caseData.status === 'Processing' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-slate-100 text-slate-600 border-slate-300'}`}>
                    {caseData.status === 'Processing' ? '辦理中' : caseData.status}
                </span>
            </td>
        </tr>
    );
}

const ExcelStep = ({ label, date, note }: { label: string; date?: string; note?: string }) => {
    const isCompleted = !!date;
    const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' }) : '';

    return (
        <div className={`flex flex-col items-center justify-center flex-1 border-r border-slate-200 last:border-r-0 py-1 min-w-[75px] h-full ${isCompleted ? 'bg-blue-100/50' : 'bg-slate-50/30'}`}>
            <span className={`text-[12px] font-black mb-0.5 ${isCompleted ? 'text-blue-800' : 'text-slate-400'}`}>{label}</span>
            <span className={`text-[13px] font-black leading-tight ${isCompleted ? 'text-slate-900' : 'text-slate-200'}`}>{isCompleted ? formatDate(date) : '--'}</span>
            {note && <div className="text-[11px] font-black bg-red-600 text-white px-1 relative mt-1 z-20 shadow-md animate-pulse">{note}</div>}
        </div>
    );
};

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
