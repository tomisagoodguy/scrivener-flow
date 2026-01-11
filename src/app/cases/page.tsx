
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
    } else {
        // Show everything NOT closed for "Ongoing" if specifically requested, or just specific status
        // README: "承辦中" vs "結案"
        query = query.neq('status', 'Closed').neq('status', 'Cancelled');
    }

    if (queryParam && typeof queryParam === 'string') {
        query = query.or(`case_number.ilike.%${queryParam}%,buyer_name.ilike.%${queryParam}%,seller_name.ilike.%${queryParam}%`);
    }

    const { data, error } = await query;

    const cases = (data || []) as unknown as DemoCase[];

    return (
        <div className="min-h-screen p-6 md:p-12 max-w-7xl mx-auto font-sans">
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
                    <div className="flex space-x-1">
                        <Link href="/cases?status=Processing">
                            <button className={`px-4 py-1.5 rounded-sm text-sm font-medium transition-all ${activeStatus === 'Processing' ? 'bg-secondary text-foreground shadow-sm' : 'text-foreground/60 hover:bg-secondary/50'}`}>
                                承辦中
                            </button>
                        </Link>
                        <Link href="/cases?status=Closed">
                            <button className={`px-4 py-1.5 rounded-sm text-sm font-medium transition-all ${activeStatus === 'Closed' ? 'bg-secondary text-foreground shadow-sm' : 'text-foreground/60 hover:bg-secondary/50'}`}>
                                已結案
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

                {/* Timeline Alert Dashboard */}
                <TimelineDashboard cases={cases} />

                {/* Case List */}
                <div className="grid gap-4">
                    {error && (
                        <div className="p-4 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg">
                            無法載入案件: {error.message}
                        </div>
                    )}

                    {cases.length === 0 && !error ? (
                        <div className="text-center py-20 text-slate-500 bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
                            目前沒有{activeStatus === 'Closed' ? '結案' : '承辦中'}的案件
                        </div>
                    ) : (
                        cases.map((c) => (
                            <CaseCard key={c.id} caseData={c} />
                        ))
                    )}
                </div>
            </main>
        </div>
    );
}

import OvertimeButton from '@/components/OvertimeButton';

// Helper for display
const LabelValue = ({ label, value, subValue, className = '' }: { label: string; value: React.ReactNode; subValue?: string; className?: string }) => (
    <div className={`flex flex-col ${className}`}>
        <span className="text-[12px] text-foreground/50 font-extrabold uppercase tracking-tight mb-0.5">{label}</span>
        <span className="font-black text-lg text-foreground leading-tight">{value || '-'}</span>
        {subValue && <span className="text-sm text-foreground/80 font-bold bg-secondary px-1.5 py-0.5 rounded inline-block w-fit mt-1 border border-border-color">{subValue}</span>}
    </div>
);

function CaseCard({ caseData }: { caseData: DemoCase }) {
    const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('zh-TW') : '-';
    // Handle milestones being potentially an array from Supabase join
    const milestones = Array.isArray(caseData.milestones) ? caseData.milestones[0] : caseData.milestones;
    // Handle financials being potentially an array from Supabase
    const financials = Array.isArray(caseData.financials) ? caseData.financials[0] : caseData.financials;

    const SIGNING_TODOS = [
        '買方蓋印章', '賣方蓋印章', '用印款', '完稅款',
        '權狀印鑑', '授權', '解約排除', '規費',
        '設定', '稅單', '差額', '整過戶'
    ];

    const TRANSFER_TODOS = [
        '整交屋', '實登', '打單', '履保', '水電', '稅費分算', '保單'
    ];

    const formatPrice = (p?: number) => {
        if (!p) return '-';
        return `${p.toLocaleString()} 萬`;
    };

    return (
        <Link href={`/cases/${caseData.id}`} className="block group">
            <div className="bg-card hover:bg-surface-hover border border-card-border rounded-xl hover:shadow-md transition-all duration-200 p-5 relative overflow-hidden">
                {/* Visual Accent Bar */}
                <div className={`absolute top-0 left-0 w-1 h-full ${caseData.status === 'Processing' ? 'bg-primary' : 'bg-slate-300'}`} />

                <div className="flex flex-col gap-6 pl-2">

                    {/* Header: ID, Status, Actions */}
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            <div className="flex flex-col">
                                <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                                    {caseData.case_number}
                                    <span className="text-xs font-normal text-foreground/40 bg-secondary px-1.5 py-0.5 rounded">
                                        {caseData.city}{caseData.district}
                                    </span>
                                </h3>
                                <span className={`text-xs mt-1 inline-flex items-center w-fit px-2 py-0.5 rounded-full ${caseData.status === 'Processing' ? 'bg-green-500/10 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                                    {caseData.status === 'Processing' ? '● 辦理中' : `● ${caseData.status}`}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Overtime Button */}
                            <OvertimeButton
                                caseId={caseData.id}
                                hasKeyed={caseData.has_keyed_overtime}
                                sealDate={milestones?.seal_date}
                            />
                        </div>
                    </div>

                    {/* Section: People & Funds */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-5 bg-secondary/50 rounded-xl border-2 border-border-color shadow-sm">
                        {/* Buyer */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-foreground/80 border-b border-border-color pb-1 mb-2">
                                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                                <span className="font-semibold text-xs">買方資訊</span>
                            </div>
                            <LabelValue label="姓名" value={caseData.buyer_name} subValue={caseData.buyer_phone} />
                            <LabelValue label="貸款銀行" value={financials?.buyer_bank || '未指定'} />
                        </div>

                        {/* Seller */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-foreground/80 border-b border-border-color pb-1 mb-2">
                                <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                                <span className="font-semibold text-xs">賣方資訊</span>
                            </div>
                            <LabelValue label="姓名" value={caseData.seller_name} subValue={caseData.seller_phone} />
                            <LabelValue
                                label="塗銷方式"
                                value={caseData.cancellation_type || '代書塗銷'}
                                className={caseData.cancellation_type === '代書塗銷' ? 'font-bold text-primary' : ''}
                            />
                            {financials?.seller_bank && <LabelValue label="代償銀行" value={financials.seller_bank} />}
                            {milestones?.redemption_date && <LabelValue label="代償日期" value={milestones.redemption_date} />}
                        </div>

                        {/* Financials */}
                        <div className="space-y-2 lg:col-span-2">
                            <div className="flex items-center gap-2 text-foreground/80 border-b border-border-color pb-1 mb-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                <span className="font-semibold text-xs">財務與稅務</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <LabelValue label="成交總價" value={formatPrice(financials?.total_price)} className="text-primary font-black text-base" />
                                <LabelValue label="稅單性質" value={caseData.tax_type || financials?.vat_type} />
                            </div>
                        </div>
                    </div>

                    {/* Section: Todos (Fixed Tasks) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-1">
                        <div>
                            <div className="text-[10px] uppercase tracking-wider text-rose-600 font-bold mb-1 flex items-center gap-2">
                                <span className="w-2 h-2 bg-rose-500 rounded-full"></span>
                                簽約後代辦事項
                            </div>
                            <CaseTodos
                                caseId={caseData.id}
                                initialTodos={caseData.todos || {}}
                                items={SIGNING_TODOS}
                                hideCompleted
                            />
                        </div>
                        <div>
                            <div className="text-[10px] uppercase tracking-wider text-orange-600 font-bold mb-1 flex items-center gap-2">
                                <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                                完稅(過戶)後代辦事項
                            </div>
                            <CaseTodos
                                caseId={caseData.id}
                                initialTodos={caseData.todos || {}}
                                items={TRANSFER_TODOS}
                                hideCompleted
                            />
                        </div>
                    </div>

                    {/* Section: Timeline */}
                    <div className="grid grid-cols-5 gap-2 text-center bg-secondary/30 border border-border-color p-4 rounded-xl shadow-inner">
                        <LabelValue label="簽約" value={formatDate(milestones?.contract_date)} className="text-foreground" />
                        <LabelValue label="用印" value={formatDate(milestones?.seal_date)} className="text-foreground" />
                        <LabelValue label="完稅" value={formatDate(milestones?.tax_payment_date)} className="text-foreground" />
                        {/* Transfer: Only show if Date or Note exists. Implications are serious if note exists. */}
                        {(milestones?.transfer_date || milestones?.transfer_note) && (
                            <LabelValue
                                label="過戶"
                                value={milestones?.transfer_note ? (
                                    <span className="text-xs bg-red-100 dark:bg-red-900/40 px-2 py-1 rounded text-red-700 dark:text-red-400 font-bold border border-red-200 dark:border-red-900/50 animate-pulse block">
                                        {milestones.transfer_note}
                                    </span>
                                ) : (
                                    formatDate(milestones?.transfer_date)
                                )}
                                className="text-foreground"
                            />
                        )}
                        <LabelValue label="交屋" value={formatDate(milestones?.handover_date)} className="text-foreground" />
                    </div>

                    {/* Footer: Notes & Tasks */}
                    {(caseData.notes || caseData.pending_tasks) && (
                        <div className="flex flex-col gap-2 mt-[-8px]">
                            {caseData.pending_tasks && (
                                <div className="text-xs bg-orange-50 text-orange-700 p-2 rounded border border-orange-100 flex items-start gap-2">
                                    <span className="font-bold whitespace-nowrap">待辦：</span>
                                    <span className="line-clamp-2">{caseData.pending_tasks}</span>
                                </div>
                            )}
                            {caseData.notes && (
                                <div className="text-xs bg-red-50 text-red-700 p-2 rounded border border-red-100 flex items-start gap-2">
                                    <span className="font-bold whitespace-nowrap">注意：</span>
                                    <span className="line-clamp-2">{caseData.notes}</span>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </Link>
    );
}
