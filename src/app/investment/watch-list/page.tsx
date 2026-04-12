import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { WatchListManager } from '@/components/features/investment/WatchListManager';

export default async function WatchListPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: watchList } = await supabase
        .from('watch_list')
        .select('id, stock_id, name, strategies, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

    return (
        <div className="min-h-screen p-6 animate-fade-in">
            <div className="max-w-3xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">自選股管理</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        新增您想追蹤的股票，每日台灣時間 22:00 自動更新裸K快照
                    </p>
                </div>
                <WatchListManager initialList={watchList ?? []} />
            </div>
        </div>
    );
}
