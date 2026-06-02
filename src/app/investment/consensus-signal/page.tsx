import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getConsensusSignals } from '@/app/actions/getConsensusSignals';
import { getFundMomentumSignals } from '@/app/actions/getFundMomentumSignals';
import ConsensusSummaryCards from './components/ConsensusSummaryCards';
import ConsensusTable from './components/ConsensusTable';
import TabSwitcher from './components/TabSwitcher';
import AccumulationCycleCard from '../fund-tracker/components/AccumulationCycleCard';
import EtfFundCrossSignal from '../fund-tracker/components/EtfFundCrossSignal';
import FundHealthTable from '../fund-tracker/components/FundHealthTable';
import type { FundMomentumSignal } from '@/types';

export const dynamic = 'force-dynamic';

export default async function ConsensusSignalPage({
    searchParams,
}: {
    searchParams: Promise<{ tab?: string }>;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return (
            <main className="max-w-4xl mx-auto px-4 py-8">
                <p className="text-slate-400 text-sm">請先登入以使用共識掃描功能。</p>
            </main>
        );
    }

    const { tab: rawTab } = await searchParams;
    const tab = rawTab === 'watchlist' ? 'watchlist' : 'market';

    // Parallel data fetch based on active tab
    const [consensusResult, watchListResult] = await Promise.all([
        tab === 'market' ? getConsensusSignals() : Promise.resolve(null),
        tab === 'watchlist'
            ? supabase.from('watch_list').select('stock_id, name').eq('user_id', user.id).order('created_at', { ascending: true })
            : Promise.resolve(null),
    ]);

    // Watchlist tab data
    let fundSignals: FundMomentumSignal[] = [];
    let watchlistEmpty = false;
    let fundDate: string | null = null;

    if (tab === 'watchlist') {
        const stocks = watchListResult?.data ?? [];
        if (stocks.length === 0) {
            watchlistEmpty = true;
        } else {
            const stockCodes = stocks.map((s) => s.stock_id);
            const rawSignals = await getFundMomentumSignals(stockCodes);
            const nameMap = new Map(stocks.map((s) => [s.stock_id, s.name as string | null]));
            fundSignals = rawSignals.map((sig): FundMomentumSignal => ({
                ...sig,
                stock_name: nameMap.get(sig.stock_id) ?? sig.stock_name,
            }));
            fundDate = fundSignals[0]?.date ?? null;
        }
    }

    const marketDate = consensusResult?.date ?? null;
    const displayDate = tab === 'market' ? marketDate : fundDate;

    return (
        <main className="max-w-[1400px] mx-auto px-4 py-6 space-y-5 animate-fade-in">
            <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-baseline gap-3 flex-1 min-w-0">
                    <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">共識掃描</h1>
                    <span className="text-xs text-slate-400">ETF 加碼 × 投信買超 × 量化選股</span>
                    {displayDate && (
                        <span className="text-xs text-slate-400 ml-auto">資料日期：{displayDate}</span>
                    )}
                </div>
                <TabSwitcher currentTab={tab} />
            </div>

            {tab === 'market' && (
                <>
                    {!consensusResult || consensusResult.signals.length === 0 ? (
                        <div className="glass-card p-6 text-center">
                            <p className="text-slate-400 text-sm">目前無資料，請等待今日 Pipeline 執行完成。</p>
                        </div>
                    ) : (
                        <>
                            <ConsensusSummaryCards signals={consensusResult.signals} />
                            <ConsensusTable signals={consensusResult.signals} />
                        </>
                    )}
                </>
            )}

            {tab === 'watchlist' && (
                <>
                    {watchlistEmpty ? (
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
                    ) : (
                        <>
                            <AccumulationCycleCard signals={fundSignals} />
                            <EtfFundCrossSignal signals={fundSignals} />
                            <FundHealthTable signals={fundSignals} />
                        </>
                    )}
                </>
            )}
        </main>
    );
}
