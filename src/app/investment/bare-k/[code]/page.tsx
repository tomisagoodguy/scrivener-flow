import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { BareKChart } from '@/components/features/investment/BareKChart';
import type { BareKSnapshot } from '@/app/api/investment/bare-k/[code]/route';

interface Props {
    params: Promise<{ code: string }>;
}

export default async function BareKDetailPage({ params }: Props) {
    const { code } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // 取快照
    const { data: snapshotRows } = await supabase
        .from('bare_k_snapshots')
        .select('stock_id, date, ohlcv, mas, signals, margin, revenue, inv_chips, summary')
        .eq('stock_id', code)
        .order('date', { ascending: false })
        .limit(1);

    // 取 watch_list 中的策略資訊
    const { data: watchItem } = await supabase
        .from('watch_list')
        .select('name, strategies')
        .eq('user_id', user.id)
        .eq('stock_id', code)
        .limit(1);

    const snapshot = snapshotRows?.[0] as BareKSnapshot | undefined;
    const stockName = watchItem?.[0]?.name ?? '';
    const strategies: string[] = watchItem?.[0]?.strategies ?? [];

    return (
        <div className="min-h-screen p-4 md:p-6 animate-fade-in">
            {/* 麵包屑 */}
            <div className="flex items-center gap-2 mb-4 text-sm">
                <Link
                    href="/investment/bare-k"
                    className="flex items-center gap-1 text-gray-500 hover:text-blue-600 transition-colors"
                >
                    <ChevronLeft size={16} /> 裸K看盤
                </Link>
                <span className="text-gray-300">/</span>
                <span className="text-gray-700 font-medium">{code}</span>
                {stockName && <span className="text-gray-400">{stockName}</span>}
            </div>

            {snapshot ? (
                <div className="glass-card rounded-2xl p-4">
                    <BareKChart
                        snapshot={snapshot}
                        stockName={stockName}
                        strategies={strategies}
                    />
                </div>
            ) : (
                <div className="glass-card rounded-2xl p-12 text-center">
                    <p className="text-gray-500 font-medium mb-2">{code} 的裸K資料尚未同步</p>
                    <p className="text-sm text-gray-400">
                        請先在
                        <Link href="/investment/watch-list" className="text-blue-500 hover:underline mx-1">
                            自選股管理
                        </Link>
                        加入此股票，資料將於每日台灣時間 22:00 後更新
                    </p>
                </div>
            )}
        </div>
    );
}
