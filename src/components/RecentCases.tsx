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
                return 'bg-gray-100 text-gray-600 border-gray-200';
            case '解約':
                return 'bg-red-50 text-red-600 border-red-100';
            case '辦理中':
            default:
                return 'bg-emerald-50 text-emerald-600 border-emerald-100';
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
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-0 overflow-hidden h-full flex flex-col">
            <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 border border-blue-100 rounded-xl text-blue-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">近期案件動態</h2>
                </div>
                <Link href="/cases" className="text-sm text-blue-600 hover:text-blue-800 transition-colors font-bold bg-blue-50 px-3 py-1.5 rounded-lg">
                    查看全部 →
                </Link>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                {recentCases.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 bg-gray-50/50 m-2 rounded-xl border border-dashed border-gray-200">
                        目前沒有案件，點擊右上角新增
                    </div>
                ) : (
                    recentCases.map((item) => (
                        <Link href={`/cases/${item.id}`} key={item.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl hover:bg-gray-50 transition-all group border border-transparent hover:border-gray-200 mb-1 last:mb-0">
                            <div className="flex items-center gap-4 mb-3 md:mb-0">
                                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-lg border border-gray-200 shadow-sm group-hover:bg-white group-hover:text-blue-600 group-hover:scale-105 transition-all">
                                    {getAvatarInitial(item.case_number)}
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors text-base">
                                        {item.case_number}
                                        {item.city && <span className="ml-2 text-gray-500 font-normal text-sm">{item.city}</span>}
                                    </h4>
                                    <p className="text-xs text-gray-500 mt-1 font-medium flex items-center gap-2">
                                        <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">買</span> {item.buyer_name}
                                        <span className="text-gray-300">|</span>
                                        <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">賣</span> {item.seller_name}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto pl-16 md:pl-0">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border min-w-[80px] text-center shadow-sm ${getStatusStyle(item.status)}`}>
                                    {item.status}
                                </span>
                                <p className="text-xs text-gray-400 font-mono font-medium">
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
