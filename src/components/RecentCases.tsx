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
            <div className="glass-card rounded-2xl p-6 md:p-8 text-red-400">
                無法載入案件資料
            </div>
        );
    }

    const recentCases = (cases || []) as Case[];

    // Helper for status styles
    const getStatusStyle = (status: string) => {
        switch (status) {
            case '結案':
                return 'bg-slate-700/50 text-slate-300 border-slate-600/30';
            case '解約':
                return 'bg-red-500/10 text-red-300 border-red-500/20';
            default: // 辦理中
                return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
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
        <section className="glass-card rounded-2xl p-6 md:p-8 animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-slate-200">近期案件動態</h2>
                <Link href="/cases" className="text-sm text-primary hover:text-primary-deep transition-colors">
                    查看全部 →
                </Link>
            </div>

            <div className="space-y-3">
                {recentCases.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        目前沒有案件，點擊右上角新增
                    </div>
                ) : (
                    recentCases.map((item) => (
                        <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl hover:bg-white/5 transition-colors group cursor-pointer border border-transparent hover:border-white/5">
                            <div className="flex items-center gap-4 mb-3 md:mb-0">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-blue-400 font-bold text-lg border border-white/5">
                                    {getAvatarInitial(item.case_number)}
                                </div>
                                <div>
                                    <h4 className="font-medium text-slate-200 group-hover:text-primary transition-colors">
                                        {item.case_number} - {item.city_area}
                                    </h4>
                                    <p className="text-sm text-slate-400 mt-1">
                                        買方：{item.buyer} <span className="mx-2 opacity-30">|</span> 賣方：{item.seller}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto pl-16 md:pl-0">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium border min-w-[80px] text-center ${getStatusStyle(item.status)}`}>
                                    {item.status}
                                </span>
                                <p className="text-xs text-slate-500 font-mono">
                                    {formatDate(item.created_at)}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </section>
    );
};
