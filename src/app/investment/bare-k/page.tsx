import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/service';

import Link from 'next/link';
import { ArrowLeft, Settings2 } from 'lucide-react';
import { BareKSummaryCard } from '@/components/features/investment/BareKSummaryCard';
import type { WatchListEntry, BareKSummary } from '@/app/api/investment/bare-k/route';

export default async function BareKOverviewPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const isOwner = !!user;
    const ownerId = user?.id ?? process.env.BARE_K_OWNER_USER_ID;
    const db = isOwner ? supabase : getAdminClient();

    const watchList = ownerId
        ? (await db
              .from('watch_list')
              .select('id, stock_id, name, strategies, created_at')
              .eq('user_id', ownerId)
              .order('created_at', { ascending: true })).data
        : null;

    // 批次取各股 summary
    const entries: WatchListEntry[] = await Promise.all(
        (watchList ?? []).map(async (w) => {
            const { data } = await supabase
                .from('bare_k_snapshots')
                .select('summary')
                .eq('stock_id', w.stock_id)
                .order('date', { ascending: false })
                .limit(1);

            const summary = (data?.[0]?.summary as BareKSummary) ?? null;
            return {
                id: w.id,
                stock_id: w.stock_id,
                name: w.name || summary?.name || '',
                strategies: w.strategies ?? [],
                created_at: w.created_at,
                summary,
            };
        })
    );

    return (
        <div className="min-h-screen p-6 animate-fade-in">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/investment"
                            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-blue-600 bg-white/60 hover:bg-white border border-gray-200 hover:border-blue-300 px-2.5 py-1.5 rounded-lg transition-all"
                        >
                            <ArrowLeft size={14} /> 返回
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">裸K看盤</h1>
                            <p className="text-sm text-gray-500 mt-0.5">
                                六面板技術分析 · 每日台灣時間 22:00 更新
                            </p>
                        </div>
                    </div>
                    {isOwner && (
                        <Link
                            href="/investment/watch-list"
                            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-600 bg-white/60 hover:bg-white border border-gray-200 px-3 py-2 rounded-xl transition-colors"
                        >
                            <Settings2 size={15} /> 管理清單
                        </Link>
                    )}
                </div>

                {entries.length === 0 ? (
                    <div className="glass-card rounded-2xl p-12 text-center">
                        <p className="text-gray-400 mb-3">尚無自選股</p>
                        {isOwner && (
                            <Link
                                href="/investment/watch-list"
                                className="text-blue-500 hover:underline text-sm"
                            >
                                前往管理清單，加入第一支股票 →
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {entries.map((entry, i) => (
                            <BareKSummaryCard key={entry.id} entry={entry} index={i} isOwner={isOwner} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
