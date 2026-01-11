import { supabase } from '@/lib/supabaseClient';

export const DashboardStats = async () => {
    const { data: cases, error } = await supabase
        .from('cases')
        .select('*');

    if (error) {
        console.error('Error fetching stats:', error);
        return null; // Or render basic 0s
    }

    const allCases = cases || [];

    // 1. Active Cases
    const activeCases = allCases.filter(c => c.status === '辦理中');

    // 2. New This Week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const newThisWeek = allCases.filter(c => new Date(c.created_at) > oneWeekAgo).length;

    // 3. Urgent (Due in 7 days) - Check handover or tax date
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const urgentCount = activeCases.filter(c => {
        const targetDate = c.handover_date ? new Date(c.handover_date) : (c.tax_payment_date ? new Date(c.tax_payment_date) : null);
        if (!targetDate) return false;
        return targetDate >= today && targetDate <= nextWeek;
    }).length;

    // 4. Completed (Total or This Month)
    // Let's do Total Completed for consistency with the big number, and maybe "Creation rate" for the subtitle
    const completedCases = allCases.filter(c => c.status === '結案');
    const completionRate = allCases.length > 0 ? Math.round((completedCases.length / allCases.length) * 100) : 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Card 1: Active Cases */}
            <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-gray-500 font-semibold text-sm uppercase tracking-wider">辦理中案件</h3>
                        <p className="text-4xl font-bold mt-2 text-gray-900">{activeCases.length}</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-xl">
                        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                </div>
                <div className="mt-6 flex items-center gap-2 text-emerald-600 text-sm">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-100 text-xs font-bold">
                        +{newThisWeek}
                    </span>
                    <span className="text-gray-500">本週新增</span>
                </div>
            </div>

            {/* Card 2: Urgent / Upcoming */}
            <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-gray-500 font-semibold text-sm uppercase tracking-wider">即將到期</h3>
                        <p className="text-4xl font-bold mt-2 text-amber-500">{urgentCount}</p>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-xl">
                        <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                </div>
                <div className="mt-6 flex items-center gap-2 text-gray-500 text-sm">
                    <span className="text-amber-600 font-bold">注意</span>
                    <span>7 天內交屋/完稅</span>
                </div>
            </div>

            {/* Card 3: Completed */}
            <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-gray-500 font-semibold text-sm uppercase tracking-wider">已結案</h3>
                        <p className="text-4xl font-bold mt-2 text-accent">{completedCases.length}</p>
                    </div>
                    <div className="p-3 bg-red-50 rounded-xl">
                        <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                </div>
                <div className="mt-6 flex items-center gap-2 text-indigo-600 text-sm">
                    <span className="text-gray-500">達成率 <span className="font-bold text-gray-900">{completionRate}%</span></span>
                </div>
            </div>
        </div>
    );
};
