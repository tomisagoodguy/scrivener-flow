import { createClient } from '@/lib/supabase/server';
import { DemoCase, Milestone } from '@/types';
import Link from 'next/link';

export const RecentCases = async () => {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    let query = supabase
        .from('cases')
        .select('*, milestones(*)')
        .neq('status', 'Closed')
        .neq('status', 'Cancelled')
        .order('created_at', { ascending: false })
        .limit(5);

    if (user) {
        query = query.eq('user_id', user.id);
    }

    const { data: cases, error } = await query;

    if (error) {
        console.error('Error fetching recent cases:', error);
        return (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-red-600">無法載入案件資料</div>
        );
    }

    const recentCases = (cases || []) as DemoCase[];

    const getStatusStyle = (status: string) => {
        switch (status) {
            case '結案':
            case 'Closed':
                return 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-slate-800 dark:text-gray-400 dark:border-slate-700';
            case '解約':
            case 'Cancelled':
                return 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30';
            default:
                return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30';
        }
    };

    const getStatusLabel = (status: string) => {
        const map: Record<string, string> = {
            Processing: '辦理中',
            Closed: '結案',
            Cancelled: '解約',
            Pending: '待辦',
            Rollback: '撤件',
        };
        return map[status] ?? status;
    };

    const formatMD = (dateStr?: string | null) => {
        if (!dateStr) return null;
        const d = new Date(dateStr);
        return `${d.getMonth() + 1}/${d.getDate()}`;
    };

    const STEPS: { label: string; key: keyof Milestone }[] = [
        { label: '簽', key: 'contract_date' },
        { label: '印', key: 'seal_date' },
        { label: '稅', key: 'tax_payment_date' },
        { label: '過', key: 'transfer_date' },
        { label: '交', key: 'handover_date' },
    ];

    return (
        <section className="bg-card dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col transition-all">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/20 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3 className="text-sm font-black text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                        最近案件進度
                    </h3>
                </div>
                <Link
                    href="/cases"
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 group"
                >
                    查看全部 <span className="group-hover:translate-x-0.5 transition-transform inline-block">→</span>
                </Link>
            </div>

            {/* List */}
            <div className="divide-y divide-gray-50 dark:divide-slate-800 flex-1 bg-white dark:bg-slate-900">
                {recentCases.length === 0 ? (
                    <div className="p-12 text-center text-gray-400 dark:text-slate-600 text-sm">尚無任何案件記錄</div>
                ) : (
                    recentCases.map((item) => {
                        const ms = (item.milestones?.[0] || {}) as Milestone;
                        return (
                            <Link
                                key={item.id}
                                href={`/cases/${item.id}`}
                                className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors group"
                            >
                                {/* Avatar */}
                                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-sm shrink-0 group-hover:scale-105 transition-transform">
                                    {item.case_number?.charAt(0) ?? '?'}
                                </div>

                                {/* Info block */}
                                <div className="min-w-0 flex-1">
                                    {/* Row 1: case number + location + status */}
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-gray-900 dark:text-gray-100 text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                            {item.case_number}
                                        </p>
                                        {(item.district || item.city) && (
                                            <span className="text-xs text-gray-400 dark:text-slate-500">
                                                {item.district || item.city}
                                            </span>
                                        )}
                                        {/* Status badge inline */}
                                        <span className={`ml-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${getStatusStyle(item.status)}`}>
                                            {getStatusLabel(item.status)}
                                        </span>
                                    </div>

                                    {/* Row 2: buyer / seller */}
                                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                                        <span className="text-gray-400 dark:text-slate-600 font-medium">買</span>
                                        <span>{item.buyer_name}</span>
                                        <span className="text-gray-300 dark:text-slate-700">·</span>
                                        <span className="text-gray-400 dark:text-slate-600 font-medium">賣</span>
                                        <span>{item.seller_name}</span>
                                    </p>

                                    {/* Row 3: milestones */}
                                    <div className="flex items-center gap-1 mt-2">
                                        {STEPS.map(({ label, key }, idx) => {
                                            const date = formatMD(ms[key] as string | null | undefined);
                                            const hasDate = !!date;
                                            return (
                                                <div key={label} className="flex items-center gap-1">
                                                    <div
                                                        className={`flex flex-col items-center px-2 py-1 rounded-lg min-w-[36px] ${
                                                            hasDate
                                                                ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30'
                                                                : 'bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700'
                                                        }`}
                                                    >
                                                        <span className={`text-[10px] font-black leading-none ${hasDate ? 'text-blue-500 dark:text-blue-400' : 'text-gray-300 dark:text-slate-600'}`}>
                                                            {label}
                                                        </span>
                                                        <span className={`text-[11px] font-bold leading-tight mt-0.5 font-mono ${hasDate ? 'text-gray-800 dark:text-gray-200' : 'text-gray-300 dark:text-slate-600'}`}>
                                                            {date ?? '--'}
                                                        </span>
                                                    </div>
                                                    {idx < STEPS.length - 1 && (
                                                        <span className="text-gray-200 dark:text-slate-700 text-[10px]">›</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                            </Link>
                        );
                    })
                )}
            </div>
        </section>
    );
};
