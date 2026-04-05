import { createClient } from '@/lib/supabase/server';
import { ClockIcon } from 'lucide-react';
import { HoldingsTable } from '@/components/features/investment/HoldingsTable';
import { DiffLedger } from '@/components/features/investment/DiffLedger';
import { HoldingsOverview } from '@/components/features/investment/HoldingsOverview';
import { RankingTrendChart } from '@/components/features/investment/RankingTrendChart';
import { ChangeImpactChart } from '@/components/features/investment/ChangeImpactChart';
import { GoldenGrowthZone } from '@/components/features/investment/GoldenGrowthZone';
import { RevenueLab } from '@/components/features/investment/RevenueLab';
import { InvestmentTabs } from '@/components/features/investment/InvestmentTabs';
import { getGoldenZoneStats } from '@/app/actions/revenueLabActions';
import { AIAnalysisPromptButton } from '@/components/features/investment/AIAnalysisPromptButton';
import { EtfComparePanel } from '@/components/features/investment/EtfComparePanel';
import React from 'react';
import { Holding } from '@/types/investment';

// ── ETF 對比資料（00980A / 00981A / 00991A）────────────────────────────────

const COMPARE_ETF_CODES = ['00980A', '00981A', '00991A'] as const;

const COMPARE_ETF_META: Record<string, { name: string; manager: string; color: string }> = {
    '00980A': { name: '野村智慧優選', manager: '野村投信', color: '#3b82f6' },
    '00981A': { name: '主動統一台股增長', manager: '統一投信', color: '#8b5cf6' },
    '00991A': { name: '復華未來50', manager: '復華投信', color: '#f59e0b' },
};

async function getCompareData() {
    const supabase = await createClient();

    const { data: dateRow } = await supabase
        .from('etf_holdings_snapshot')
        .select('data_date')
        .in('etf_code', COMPARE_ETF_CODES as unknown as string[])
        .order('data_date', { ascending: false })
        .limit(1);

    const targetDate = dateRow?.[0]?.data_date ?? null;
    if (!targetDate) return null;

    const { data: allHoldings } = await supabase
        .from('etf_holdings_snapshot')
        .select('etf_code, stock_code, stock_name, weight, data_date')
        .in('etf_code', COMPARE_ETF_CODES as unknown as string[])
        .eq('data_date', targetDate)
        .order('weight', { ascending: false });

    const { data: aumRows } = await supabase
        .from('etf_aum')
        .select('etf_code, aum_100m_twd, snapshot_date')
        .in('etf_code', COMPARE_ETF_CODES as unknown as string[])
        .order('snapshot_date', { ascending: false })
        .limit(COMPARE_ETF_CODES.length * 3);

    const { data: sectorRows } = await supabase
        .from('etf_sectors')
        .select('etf_code, sector_name, weight, snapshot_date')
        .in('etf_code', COMPARE_ETF_CODES as unknown as string[])
        .order('snapshot_date', { ascending: false })
        .limit(COMPARE_ETF_CODES.length * 30);

    const stockEtfMap: Record<string, string[]> = {};
    for (const h of allHoldings ?? []) {
        if (!stockEtfMap[h.stock_code]) stockEtfMap[h.stock_code] = [];
        if (!stockEtfMap[h.stock_code].includes(h.etf_code)) {
            stockEtfMap[h.stock_code].push(h.etf_code);
        }
    }

    const etfs = COMPARE_ETF_CODES.map((etf_code) => {
        const holdings = (allHoldings ?? [])
            .filter(h => h.etf_code === etf_code)
            .map((h, idx) => ({
                stock_code: h.stock_code,
                stock_name: h.stock_name,
                weight: h.weight ?? 0,
                rank: idx + 1,
                in_etfs: stockEtfMap[h.stock_code] ?? [etf_code],
            }));

        const latestAum = (aumRows ?? [])
            .filter(a => a.etf_code === etf_code)
            .sort((a, b) => new Date(b.snapshot_date).getTime() - new Date(a.snapshot_date).getTime())[0];

        const latestSectorDate = (sectorRows ?? [])
            .filter(s => s.etf_code === etf_code)
            .sort((a, b) => new Date(b.snapshot_date).getTime() - new Date(a.snapshot_date).getTime())[0]?.snapshot_date;

        const sectors = (sectorRows ?? [])
            .filter(s => s.etf_code === etf_code && s.snapshot_date === latestSectorDate)
            .map(s => ({ sector_name: s.sector_name, weight: s.weight ?? 0 }))
            .sort((a, b) => b.weight - a.weight);

        return {
            etf_code,
            ...COMPARE_ETF_META[etf_code],
            data_date: targetDate,
            holdings,
            aum_100m_twd: latestAum?.aum_100m_twd ?? null,
            sectors,
        };
    });

    const overlap = {
        all3: Object.entries(stockEtfMap)
            .filter(([, etfList]) => etfList.length === 3)
            .map(([code]) => code),
        any2: Object.entries(stockEtfMap)
            .filter(([, etfList]) => etfList.length === 2)
            .map(([code]) => code),
    };

    return { etfs, overlap };
}

// Fetch data on server
async function getHoldings() {
    const supabase = await createClient();
    
    // First, get the latest 2 available dates to check data integrity
    const { data: dateCandidates } = await supabase
        .from('etf_holdings_snapshot')
        .select('data_date, updated_at')
        .order('data_date', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(2); // Fetch top 2
    
    if (!dateCandidates || dateCandidates.length === 0) return { holdings: [], updatedAt: null, dataDate: null };

    // Helper to fetch holdings for a specific date
    const fetchHoldingsForDate = async (date: string) => {
        const { data } = await supabase
            .from('etf_holdings_snapshot')
            .select('*')
            .eq('etf_code', '00981A')
            .eq('data_date', date)
            .order('weight', { ascending: false });
        return data || [];
    };

    // 1. Try latest date
    let targetDate = dateCandidates[0].data_date;
    let targetUpdatedAt = dateCandidates[0].updated_at;
    let data = await fetchHoldingsForDate(targetDate);

    // 2. Integrity Check: If majority of prices are 0 or null, fallback to previous date
    // (Assuming valid data should have non-zero prices for most stocks)
    const validPriceCount = data.filter(h => h.price && h.price > 0).length;
    const totalCount = data.length;
    const isValid = totalCount > 0 && (validPriceCount / totalCount) > 0.5; // Threshold: 50% valid prices

    if (!isValid && dateCandidates.length > 1) {
        console.info(`⚠️ Snapshot for ${targetDate} seems incomplete (Valid Prices: ${validPriceCount}/${totalCount}). Falling back to ${dateCandidates[1].data_date}`);
        targetDate = dateCandidates[1].data_date;
        targetUpdatedAt = dateCandidates[1].updated_at;
        data = await fetchHoldingsForDate(targetDate);
    }

    // Fetch industry info
    const { data: industryData } = await supabase
        .from('stock_basic_info')
        .select('stock_code, industry')
        .in('stock_code', (data || []).map(h => h.stock_code));
    
    const industryMap: Record<string, string> = {};
    industryData?.forEach(i => {
        industryMap[i.stock_code] = i.industry;
    });

    // Fetch latest revenue data (including YoY, MoM)
    const { data: revData } = await supabase
        .from('stock_revenue_monthly')
        .select('stock_code, data_date, revenue_yoy, revenue_mom')
        .in('stock_code', (data || []).map(h => h.stock_code))
        .order('data_date', { ascending: false });

    // Map: Code -> { date, yoy, mom }
    const revMap: Record<string, { date: string, yoy: number, mom: number }> = {};
    
    // Iterate and pick the first (latest) one for each code
    revData?.forEach(r => {
        if (!revMap[r.stock_code]) {
            revMap[r.stock_code] = {
                date: r.data_date.substring(0, 7),
                yoy: r.revenue_yoy,
                mom: r.revenue_mom
            };
        }
    });

    const formattedHoldings = (data || []).map(h => {
        const revInfo = revMap[h.stock_code];
        return {
            ...h,
            industry: industryMap[h.stock_code] || '未知',
            revenue_month: revInfo?.date || null,
            revenue_yoy: revInfo?.yoy ?? null,
            revenue_mom: revInfo?.mom ?? null
        };
    });

    return {
        holdings: formattedHoldings,
        updatedAt: targetUpdatedAt,
        dataDate: targetDate
    };
}

/**
 * 計算三大量化 Filter (Server-side, 供 UI 直接顯示)
 * - momentum_pass : close / close[60] - 1 > 0
 * - it_buy_10d_pass: 投信10日累積 > 0
 * - rev_ma3_new_high: revMa3 == revMa3.rolling(12).max()
 */
async function fetchQuantFilters(stockCodes: string[]): Promise<Record<string, {
    momentum_60d: number | null;
    momentum_pass: boolean;
    it_buy_10d: number | null;
    it_buy_10d_pass: boolean;
    rev_ma3: number | null;
    rev_ma3_new_high: boolean;
    filter_score: number;
}>> {
    if (stockCodes.length === 0) return {};
    const supabase = await createClient();

    // (A) 抓 65 天價格與投信，足以計算 60日動能 + 10日投信
    const { data: priceData } = await supabase
        .from('stock_prices_daily')
        .select('stock_code, data_date, close, it_buy')
        .in('stock_code', stockCodes)
        .order('data_date', { ascending: false })
        .limit(65 * stockCodes.length);

    // (B) 抓 14 個月營收，足以計算 rev_ma3.rolling(12).max()
    const { data: revenueData } = await supabase
        .from('stock_revenue_monthly')
        .select('stock_code, data_date, revenue')
        .in('stock_code', stockCodes)
        .order('data_date', { ascending: false })
        .limit(15 * stockCodes.length);

    const result: Record<string, {
        momentum_60d: number | null;
        momentum_pass: boolean;
        it_buy_10d: number | null;
        it_buy_10d_pass: boolean;
        rev_ma3: number | null;
        rev_ma3_new_high: boolean;
        filter_score: number;
    }> = {};

    for (const code of stockCodes) {
        // ---- Price & IT ----
        const prices = (priceData?.filter(p => p.stock_code === code) || [])
            .sort((a, b) => new Date(b.data_date).getTime() - new Date(a.data_date).getTime());

        let momentum_60d: number | null = null;
        let momentum_pass = false;
        let it_buy_10d: number | null = null;
        let it_buy_10d_pass = false;

        if (prices.length >= 20) {
            const closes = prices.map(p => Number(p.close));
            const itBuys = prices.map(p => Number(p.it_buy || 0));

            // Momentum filter
            if (prices.length >= 61 && closes[60] > 0) {
                momentum_60d = Number(((closes[0] / closes[60] - 1) * 100).toFixed(2));
                momentum_pass = momentum_60d > 0;
            }

            // 投信 10日 filter
            it_buy_10d = itBuys.slice(0, 10).reduce((a, b) => a + b, 0);
            it_buy_10d_pass = it_buy_10d > 0;
        }

        // ---- Revenue MA3 New High ----
        const revs = (revenueData?.filter(r => r.stock_code === code) || [])
            .sort((a, b) => new Date(b.data_date).getTime() - new Date(a.data_date).getTime());

        let rev_ma3: number | null = null;
        let rev_ma3_new_high = false;

        if (revs.length >= 14) {
            // 計算 12 個連續 rev_ma3（從最新往回推）
            const ma3Series: number[] = [];
            for (let i = 0; i <= 11; i++) {
                const avg = (
                    Number(revs[i]?.revenue || 0) +
                    Number(revs[i + 1]?.revenue || 0) +
                    Number(revs[i + 2]?.revenue || 0)
                ) / 3;
                ma3Series.push(avg);
            }
            rev_ma3 = Number(ma3Series[0].toFixed(0));
            const rollingMax = Math.max(...ma3Series);
            rev_ma3_new_high = ma3Series[0] > 0 && Math.abs(ma3Series[0] - rollingMax) < 0.01;
        } else if (revs.length >= 3) {
            rev_ma3 = Number(((Number(revs[0]?.revenue || 0) + Number(revs[1]?.revenue || 0) + Number(revs[2]?.revenue || 0)) / 3).toFixed(0));
        }

        const filter_score = (momentum_pass ? 1 : 0) + (it_buy_10d_pass ? 1 : 0) + (rev_ma3_new_high ? 1 : 0);

        result[code] = { momentum_60d, momentum_pass, it_buy_10d, it_buy_10d_pass, rev_ma3, rev_ma3_new_high, filter_score };
    }

    return result;
}


async function getRankingHistory() {
    const supabase = await createClient();

    // 優先從 etf_weight_history 撈（有預計算 rank）
    const { count } = await supabase
        .from('etf_weight_history')
        .select('*', { count: 'exact', head: true })
        .eq('etf_code', '00981A');

    if (count && count > 0) {
        const { data } = await supabase
            .from('etf_weight_history')
            .select('data_date, stock_code, stock_name, weight, rank')
            .eq('etf_code', '00981A')
            .order('data_date', { ascending: true });
        return data ?? [];
    }

    // Fallback：從 etf_holdings_snapshot 聚合，補算 rank
    const { data } = await supabase
        .from('etf_holdings_snapshot')
        .select('data_date, stock_code, stock_name, weight')
        .eq('etf_code', '00981A')
        .order('data_date', { ascending: true });

    if (!data || data.length === 0) return [];

    // 依日期分組，補算 rank（weight 降序，1 = 最大）
    const byDate: Record<string, typeof data> = {};
    for (const row of data) {
        const d = row.data_date as string;
        if (!byDate[d]) byDate[d] = [];
        byDate[d].push(row);
    }

    const withRank: (typeof data[number] & { rank: number })[] = [];
    for (const rows of Object.values(byDate)) {
        const sorted = [...rows].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));
        sorted.forEach((row, i) => {
            withRank.push({ ...row, rank: i + 1 });
        });
    }

    return withRank;
}

async function getDiffLogs() {
    const supabase = await createClient();
    
    // 1. Fetch logs
    const { data: logsData } = await supabase
        .from('etf_diff_logs')
        .select('id, etf_code, data_date, change_type, stock_code, stock_name, diff_shares, diff_weight, description, created_at, prev_shares, curr_shares, prev_weight, curr_weight, is_significant')
        .eq('etf_code', '00981A')
        .order('data_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(500);
    
    if (!logsData) return [];

    // 2. Fetch all snapshot data for these dates to calculate rank
    const uniqueDates = [...new Set(logsData.map(l => l.data_date))];
    const { data: snapshotData } = await supabase
        .from('etf_holdings_snapshot')
        .select('data_date, stock_code, weight')
        .in('data_date', uniqueDates)
        .eq('etf_code', '00981A');

    // 3. Build ranking map: { date: { stock_code: rank } }
    const dateRankMap: Record<string, Record<string, number>> = {};
    uniqueDates.forEach(date => {
        const dayHoldings = (snapshotData || [])
            .filter(s => s.data_date === date)
            .sort((a, b) => (b.weight || 0) - (a.weight || 0));
        
        dateRankMap[date] = {};
        dayHoldings.forEach((h, index) => {
            dateRankMap[date][h.stock_code] = index + 1;
        });
    });

    // 4. Fetch industry info
    const { data: industryData } = await supabase
        .from('stock_basic_info')
        .select('stock_code, industry')
        .in('stock_code', logsData.map(l => l.stock_code));
    
    const industryMap: Record<string, string> = {};
    industryData?.forEach(i => {
        industryMap[i.stock_code] = i.industry;
    });

    return logsData.map(l => ({
        ...l,
        industry: industryMap[l.stock_code] || undefined,
        rank: dateRankMap[l.data_date]?.[l.stock_code] || null
    }));
}

export default async function InvestmentPage() {
    const { holdings, updatedAt, dataDate } = await getHoldings();

    // 並行計算三大量化 Filter（不阻塞其他 fetch）
    const [logs, rankingHistory, goldenZoneStats, quantFilters, compareData] = await Promise.all([
        getDiffLogs(),
        getRankingHistory(),
        getGoldenZoneStats(),
        fetchQuantFilters(holdings.map(h => h.stock_code)),
        getCompareData(),
    ]);

    // Merge quantitative filter data into holdings
    const holdingsWithFilters = holdings.map(h => ({
        ...h,
        ...quantFilters[h.stock_code],
    })) as Holding[];

    // 顯示最新的資料日期
    const displayDate = dataDate ? new Date(dataDate).toLocaleDateString('zh-TW', {
        month: '2-digit',
        day: '2-digit',
    }) : 'N/A';

    const updateTime = updatedAt ? new Date(updatedAt).toLocaleTimeString('zh-TW', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }) : '';

    return (
        <div className="container mx-auto py-8 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        00981A 投資監控
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        主動統一台股增長 • 即時追蹤持股異動與投資策略
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-full text-sm font-medium text-slate-700 dark:text-white">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        資料日期: {displayDate} <span className="text-slate-400 dark:text-slate-300 text-xs ml-1">({updateTime})</span>
                    </div>
                    <AIAnalysisPromptButton holdings={holdingsWithFilters} dataDate={displayDate} />
                </div>
            </div>

            {/* Holdings Table Section */}
            <React.Suspense fallback={<div className="h-96 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" />}>
                <InvestmentTabs
                    compareContent={
                        compareData ? (
                            <EtfComparePanel etfs={compareData.etfs} overlap={compareData.overlap} />
                        ) : (
                            <div className="glass-card rounded-2xl p-12 text-center text-slate-500 dark:text-slate-400">
                                <p className="text-lg">暫無對比資料</p>
                                <p className="text-sm mt-2">系統每日 22:00 自動更新</p>
                            </div>
                        )
                    }
                    analysisContent={
                        <GoldenGrowthZone
                            data={holdingsWithFilters}
                            historicalStats={goldenZoneStats?.stats}
                        />
                    }
                    revenueLabContent={<RevenueLab currentHoldings={holdingsWithFilters} />}
                    holdingsContent={
                        <div className="w-full space-y-6">
                            <HoldingsOverview data={holdingsWithFilters} />
                            <HoldingsTable initialData={holdingsWithFilters} />
                        </div>
                    }
                    ledgerContent={
                        <div className="w-full space-y-8">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <RankingTrendChart data={rankingHistory} />
                                <ChangeImpactChart logs={logs} />
                            </div>
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <ClockIcon className="w-5 h-5 text-indigo-500" />
                                    近期異動紀錄
                                </h3>
                            </div>
                            <DiffLedger logs={logs} />
                        </div>
                    }
                />
            </React.Suspense>

        </div>
    );
}
