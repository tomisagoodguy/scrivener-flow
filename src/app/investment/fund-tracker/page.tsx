import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getFundMomentumSignals } from '@/app/actions/getFundMomentumSignals';
import FundHealthTable from './components/FundHealthTable';
import AccumulationCycleCard from './components/AccumulationCycleCard';
import EtfFundCrossSignal from './components/EtfFundCrossSignal';
import type { FundMomentumSignal } from '@/types';

export const dynamic = 'force-dynamic';

export default async function FundTrackerPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return (
            <main className="max-w-4xl mx-auto px-4 py-8">
                <p className="text-slate-400 text-sm">請先登入以使用投信追蹤功能。</p>
            </main>
        );
    }

    const { data: watchList } = await supabase
        .from('watch_list')
        .select('stock_id, name')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

    const stocks = watchList ?? [];

    if (stocks.length === 0) {
        return (
            <main className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
                <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">
                    投信追蹤
                </h1>
                <div className="glass-card p-6 text-center">
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        您的觀察清單尚無股票。
                    </p>
                    <Link
                        href="/investment/bare-k"
                        className="inline-block mt-3 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        前往裸K看盤新增自選股 →
                    </Link>
                </div>
            </main>
        );
    }

    const stockCodes = stocks.map((s) => s.stock_id);
    const signals = await getFundMomentumSignals(stockCodes);

    // 合併名稱（watch_list.name 優先）
    const nameMap = new Map(stocks.map((s) => [s.stock_id, s.name as string | null]));
    const enriched: FundMomentumSignal[] = signals.map((sig) => ({
        ...sig,
        stock_name: nameMap.get(sig.stock_id) ?? sig.stock_name,
    }));

    const dataDate = enriched[0]?.date ?? null;

    return (
        <main className="max-w-[1400px] mx-auto px-4 py-6 space-y-6 animate-fade-in">
            <div className="flex items-baseline gap-3">
                <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                    投信追蹤
                </h1>
                {dataDate && (
                    <span className="text-sm text-slate-400">資料日期：{dataDate}</span>
                )}
            </div>

            <AccumulationCycleCard signals={enriched} />

            <EtfFundCrossSignal signals={enriched} />

            <FundHealthTable signals={enriched} />
        </main>
    );
}
