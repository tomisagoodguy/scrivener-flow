import { supabase } from '@/lib/supabaseClient';
import { Case } from '@/types';
import Link from 'next/link';

export const RecentCases = async () => {
    // 1. Fetch data
    const { data: cases, error } = await supabase
        .from('cases')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching recent cases:', error);
        return (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-6 md:p-8 text-red-600">
                無法載入案件資料
            </div>
        );
    }

    const recentCases = (cases || []) as Case[];

    // Helper for status styles - Optimized for Light Mode
    const getStatusStyle = (status: string) => {
        switch (status) {
            case '結案':
                return 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-slate-800 dark:text-gray-400 dark:border-slate-700';
            case '解約':
                return 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30';
            case '辦理中':
            default:
                return 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30';
        }
    };

    // Helper for avatar initial
    const getAvatarInitial = (text: string) => {
        return text ? text.charAt(0).toUpperCase() : '?';
    };

    // Helper to format date
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('zh-TW');
    };

    return (
        <section className="bg-card dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 p-0 overflow-hidden h-full flex flex-col transition-all">
            <div className="p-5 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/20 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3 className="text-sm font-black text-gray-800 dark:text-gray-200 uppercase tracking-wider">最近案件進度</h3>
                </div>
                <Link href="/cases" className="text-xs font-black text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 uppercase tracking-widest flex items-center gap-1 group">
                    查看全部 <span className="group-hover:translate-x-1 transition-transform">→</span>
                </Link>
            </div>

            <div className="divide-y divide-gray-50 dark:divide-slate-800 flex-1 bg-white dark:bg-slate-900">
                {recentCases.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="text-gray-400 dark:text-slate-600 text-sm font-medium">尚無任何案件記錄</div>
                    </div>
                ) : (
                    recentCases.map((item) => (
                        <Link
                            key={item.id}
                            href={`/cases/${item.id}`}
                            className="flex flex-col md:flex-row items-start md:items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all group gap-4"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-600 dark:text-slate-400 font-bold text-lg border border-gray-200 dark:border-slate-700 shadow-sm group-hover:bg-white dark:group-hover:bg-slate-700 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:scale-105 transition-all">
                                    {getAvatarInitial(item.case_number)}
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-base">
                                        {item.case_number}
                                        {item.city && <span className="ml-2 text-gray-500 dark:text-slate-500 font-normal text-sm">{item.city}</span>}
                                    </h4>
                                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 font-medium flex items-center gap-2">
                                        <span className="bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-gray-600 dark:text-slate-300">買</span> {item.buyer_name}
                                        <span className="text-gray-300 dark:text-slate-700">|</span>
                                        <span className="bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-gray-600 dark:text-slate-300">賣</span> {item.seller_name}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto pl-16 md:pl-0">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border min-w-[80px] text-center shadow-sm ${getStatusStyle(item.status)}`}>
                                    {item.status}
                                </span>
                                <p className="text-xs text-gray-400 dark:text-slate-500 font-mono font-medium">
                                    {formatDate(item.created_at)}
                                </p>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </section>
    );
};
