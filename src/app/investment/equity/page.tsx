import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { fetchRankingData } from '@/lib/investment/equityPageData';
import type { SortKey, SortDir, Tier } from '@/lib/investment/equityPageData';
import { DoubleSignalSection } from '@/components/features/investment/equity/DoubleSignalSection';
import { TierNav } from '@/components/features/investment/equity/TierNav';
import { RankingPanelGrid } from '@/components/features/investment/equity/RankingPanelGrid';

const VALID_SORT_KEYS: SortKey[] = [
    'total_shareholders', 'shareholders_change_rate',
    'big_holder_pct_change', 'mid_holder_pct_change', 'whale_holder_pct_change',
    'it_buy_5d', 'amount',
];

export default async function EquityDistributionPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
    const params = await searchParams;
    const sortRaw = params.sort as SortKey | undefined;
    const sort: SortKey | null = sortRaw && VALID_SORT_KEYS.includes(sortRaw) ? sortRaw : null;
    const dir: SortDir = params.dir === 'asc' ? 'asc' : 'desc';
    const tierRaw = params.tier;
    const tier: Tier | null = tierRaw === '200' || tierRaw === '400' || tierRaw === '1000' ? tierRaw : null;
    const data = await fetchRankingData(sort, dir, tier);

    return (
        <div className="min-h-screen p-6 animate-fade-in">
            <div className="max-w-screen-2xl mx-auto">
                <div className="flex items-center gap-3 mb-6">
                    <Link href="/investment" className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-blue-600 bg-white/60 hover:bg-white border border-gray-200 hover:border-blue-300 px-2.5 py-1.5 rounded-lg transition-all">
                        <ArrowLeft size={14} /> 返回
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">籌碼排行榜</h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            E 經理人 ETF 成分股 · 股東分散表（TDCC）· 每週一更新
                            {data && <span className="ml-2 text-blue-500 font-medium">資料日期：{data.snapshotDate}</span>}
                        </p>
                    </div>
                </div>
                <TierNav tier={tier} />
                {!data ? (
                    <div className="glass-card rounded-2xl p-12 text-center">
                        <p className="text-gray-400">尚無資料，每週一更新</p>
                    </div>
                ) : (
                    <>
                        <DoubleSignalSection rows={data.doubleSignalRanking} priceIndicators={data.priceIndicators} />
                        <RankingPanelGrid data={data} sort={sort} dir={dir} />
                    </>
                )}
            </div>
        </div>
    );
}
