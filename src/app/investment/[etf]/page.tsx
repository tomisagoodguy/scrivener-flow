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
import { EtfSelector } from '@/components/features/investment/EtfSelector';
import { StockPickerHub } from '@/components/features/investment/StockPickerHub';
import React from 'react';
import { Holding } from '@/types/investment';
import { redirect } from 'next/navigation';

// ── ETF 設定 ────────────────────────────────────────────────────────────────

const SUPPORTED_ETFS = ['00980A', '00981A', '00991A'] as const;
const DEFAULT_ETF = '00981A';

const ETF_META: Record<string, { shortCode: string; name: string; manager: string }> = {
    '00980A': { shortCode: '00980', name: '野村智慧優選', manager: '野村投信' },
    '00981A': { shortCode: '00981', name: '主動統一台股增長', manager: '統一投信' },
    '00991A': { shortCode: '00991', name: '復華未來50', manager: '復華投信' },
};

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
async function getHoldings(etfCode: string) {
    const supabase = await createClient();

    const { data: dateCandidates } = await supabase
        .from('etf_holdings_snapshot')
        .select('data_date, updated_at')
        .eq('etf_code', etfCode)
        .order('data_date', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(2);

    if (!dateCandidates || dateCandidates.length === 0) return { holdings: [], updatedAt: null, dataDate: null };

    const fetchHoldingsForDate = async (date: string) => {
        const { data } = await supabase
            .from('etf_holdings_snapshot')
            .select('*')
            .eq('etf_code', etfCode)
            .eq('data_date', date)
            .order('weight', { ascending: false });
        return data || [];
    };

    let targetDate = dateCandidates[0].data_date;
    let targetUpdatedAt = dateCandidates[0].updated_at;
    let data = await fetchHoldingsForDate(targetDate);

    const validPriceCount = data.filter(h => h.price && h.price > 0).length;
    const totalCount = data.length;
    const isValid = totalCount > 0 && (validPriceCount / totalCount) > 0.5;

    if (!isValid && dateCandidates.length > 1) {
        console.info(`⚠️ Snapshot for ${targetDate} seems incomplete. Falling back to ${dateCandidates[1].data_date}`);
        targetDate = dateCandidates[1].data_date;
        targetUpdatedAt = dateCandidates[1].updated_at;
        data = await fetchHoldingsForDate(targetDate);
    }

    const { data: industryData } = await supabase
        .from('stock_basic_info')
        .select('stock_code, industry')
        .in('stock_code', (data || []).map(h => h.stock_code));

    const industryMap: Record<string, string> = {};
    industryData?.forEach(i => {
        industryMap[i.stock_code] = i.industry;
    });

    const { data: revData } = await supabase
        .from('stock_revenue_monthly')
        .select('stock_code, data_date, revenue_yoy, revenue_mom')
        .in('stock_code', (data || []).map(h => h.stock_code))
        .order('data_date', { ascending: false });

    const revMap: Record<string, { date: string, yoy: number, mom: number }> = {};
    revData?.forEach(r => {
        if (!revMap[r.stock_code]) {
            revMap[r.stock_code] = {
                date: r.data_date.substring(0, 7),
                yoy: r.revenue_yoy,
                mom: r.revenue_mom
            };
        }
    });

    // 對 price = null 的持股（00980A / 00991A），從 stock_prices_daily 補充最新股價
    const missingPriceCodes = (data || [])
        .filter(h => !h.price || h.price === 0)
        .map(h => h.stock_code);

    const priceMap: Record<string, { price: number; change_percent: number; amount: number | null; margin_ratio: number | null }> = {};

    if (missingPriceCodes.length > 0) {
        const { data: latestPrices } = await supabase
            .from('stock_prices_daily')
            .select('stock_code, data_date, close, amount, margin_ratio')
            .in('stock_code', missingPriceCodes)
            .order('data_date', { ascending: false })
            .limit(2 * missingPriceCodes.length);

        // 每支股票取最新 2 天，計算漲跌
        const grouped: Record<string, typeof latestPrices> = {};
        for (const row of latestPrices ?? []) {
            if (!grouped[row.stock_code]) grouped[row.stock_code] = [];
            if (grouped[row.stock_code]!.length < 2) grouped[row.stock_code]!.push(row);
        }

        for (const [code, rows] of Object.entries(grouped)) {
            if (!rows || rows.length === 0) continue;
            const latest = rows[0];
            const prev = rows[1];
            const close = Number(latest.close ?? 0);
            const prevClose = prev ? Number(prev.close ?? 0) : 0;
            const change_percent = prevClose > 0 ? Number(((close / prevClose - 1) * 100).toFixed(2)) : 0;
            priceMap[code] = {
                price: close,
                change_percent,
                amount: latest.amount ? Number(latest.amount) : null,
                margin_ratio: latest.margin_ratio ? Number(latest.margin_ratio) : null,
            };
        }
    }

    const formattedHoldings = (data || []).map(h => {
        const revInfo = revMap[h.stock_code];
        const priceInfo = priceMap[h.stock_code];
        return {
            ...h,
            price: h.price ?? priceInfo?.price ?? null,
            change_percent: h.change_percent ?? priceInfo?.change_percent ?? null,
            amount: h.amount ?? priceInfo?.amount ?? null,
            margin_ratio: h.margin_ratio ?? priceInfo?.margin_ratio ?? null,
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

    // 查最近 10 天（it_buy 用），每支股票各取 10 筆
    const { data: recentPriceData } = await supabase
        .from('stock_prices_daily')
        .select('stock_code, data_date, close, it_buy')
        .in('stock_code', stockCodes)
        .order('data_date', { ascending: false })
        .limit(10 * stockCodes.length);

    // 計算 61 個自然日前的日期上限（交易日約 60 個 ≈ 85 個自然日，保守取 100 天）
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 100);
    const cutoffStr = cutoffDate.toISOString().slice(0, 10);

    // 查 61 天前附近的收盤價（每支股票各取 5 筆以防非交易日缺漏）
    const { data: oldPriceData } = await supabase
        .from('stock_prices_daily')
        .select('stock_code, data_date, close')
        .in('stock_code', stockCodes)
        .gte('data_date', cutoffStr)
        .order('data_date', { ascending: true })
        .limit(5 * stockCodes.length);

    const { data: revenueData } = await supabase
        .from('stock_revenue_monthly')
        .select('stock_code, data_date, revenue')
        .in('stock_code', stockCodes)
        .order('data_date', { ascending: false })
        .limit(15 * stockCodes.length);

    // 建立 oldClose map：每支股票取最舊的那筆（最接近 61 天前）
    const oldCloseMap: Record<string, number> = {};
    for (const row of oldPriceData ?? []) {
        if (!oldCloseMap[row.stock_code] && Number(row.close) > 0) {
            oldCloseMap[row.stock_code] = Number(row.close);
        }
    }

    // 建立 recentPrices map（每支股票最近 10 筆，依日期降序）
    const recentPricesMap: Record<string, typeof recentPriceData> = {};
    for (const row of recentPriceData ?? []) {
        if (!recentPricesMap[row.stock_code]) recentPricesMap[row.stock_code] = [];
        recentPricesMap[row.stock_code]!.push(row);
    }

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
        const prices = (recentPricesMap[code] ?? [])
            .sort((a, b) => new Date(b.data_date).getTime() - new Date(a.data_date).getTime());

        let momentum_60d: number | null = null;
        let momentum_pass = false;
        let it_buy_10d: number | null = null;
        let it_buy_10d_pass = false;

        if (prices.length >= 1) {
            const latestClose = Number(prices[0].close);
            const oldClose = oldCloseMap[code];

            if (latestClose > 0 && oldClose && oldClose > 0) {
                momentum_60d = Number(((latestClose / oldClose - 1) * 100).toFixed(2));
                momentum_pass = momentum_60d > 0;
            }

            const itBuys = prices.map(p => Number(p.it_buy || 0));
            it_buy_10d = itBuys.reduce((a, b) => a + b, 0);
            it_buy_10d_pass = it_buy_10d > 0;
        }

        const revs = (revenueData?.filter(r => r.stock_code === code) || [])
            .sort((a, b) => new Date(b.data_date).getTime() - new Date(a.data_date).getTime());

        let rev_ma3: number | null = null;
        let rev_ma3_new_high = false;

        if (revs.length >= 14) {
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


async function getRankingHistory(etfCode: string) {
    const supabase = await createClient();

    const { count } = await supabase
        .from('etf_weight_history')
        .select('*', { count: 'exact', head: true })
        .eq('etf_code', etfCode);

    if (count && count > 0) {
        const { data: historyData } = await supabase
            .from('etf_weight_history')
            .select('data_date, stock_code, stock_name, weight, rank')
            .eq('etf_code', etfCode)
            .order('data_date', { ascending: true });

        const distinctDates = new Set((historyData ?? []).map(r => r.data_date)).size;
        if (distinctDates > 1) return historyData ?? [];
    }

    const { data } = await supabase
        .from('etf_holdings_snapshot')
        .select('data_date, stock_code, stock_name, weight')
        .eq('etf_code', etfCode)
        .order('data_date', { ascending: true });

    if (!data || data.length === 0) return [];

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

async function getDiffLogs(etfCode: string) {
    const supabase = await createClient();

    const { data: logsData } = await supabase
        .from('etf_diff_logs')
        .select('id, etf_code, data_date, change_type, stock_code, stock_name, diff_shares, diff_weight, description, created_at, prev_shares, curr_shares, prev_weight, curr_weight, is_significant')
        .eq('etf_code', etfCode)
        .order('data_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(500);

    if (!logsData) return [];

    const uniqueDates = [...new Set(logsData.map(l => l.data_date))];
    const { data: snapshotData } = await supabase
        .from('etf_holdings_snapshot')
        .select('data_date, stock_code, weight')
        .in('data_date', uniqueDates)
        .eq('etf_code', etfCode);

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

export default async function InvestmentEtfPage({
    params,
    searchParams,
}: {
    params: Promise<{ etf: string }>;
    searchParams: Promise<{ tab?: string }>;
}) {
    const { etf } = await params;
    await searchParams;

    // 1.5 不合法 ETF segment → redirect 到預設
    if (!(SUPPORTED_ETFS as readonly string[]).includes(etf)) {
        redirect(`/investment/${DEFAULT_ETF}`);
    }

    const etfCode = etf;
    const etfMeta = ETF_META[etfCode] ?? ETF_META[DEFAULT_ETF];

    const { holdings, updatedAt, dataDate } = await getHoldings(etfCode);

    const [logs, rankingHistory, goldenZoneStats, quantFilters, compareData] = await Promise.all([
        getDiffLogs(etfCode),
        getRankingHistory(etfCode),
        getGoldenZoneStats(),
        fetchQuantFilters(holdings.map(h => h.stock_code)),
        getCompareData(),
    ]);

    const holdingsWithFilters = holdings.map(h => ({
        ...h,
        ...quantFilters[h.stock_code],
    })) as Holding[];

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
                        {etfMeta.shortCode} 投資監控
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        {etfMeta.name} · {etfMeta.manager} • 即時追蹤持股異動與投資策略
                    </p>
                    <div className="mt-3">
                        <EtfSelector currentEtf={etfCode} />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-full text-sm font-medium text-slate-700 dark:text-white">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        資料日期: {displayDate} <span className="text-slate-400 dark:text-slate-300 text-xs ml-1">({updateTime})</span>
                    </div>
                    <AIAnalysisPromptButton holdings={holdingsWithFilters} dataDate={displayDate} />
                </div>
            </div>

            <React.Suspense fallback={<div className="h-96 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" />}>
                <InvestmentTabs
                    stockPickerContent={
                        compareData ? (
                            <StockPickerHub
                                etfs={compareData.etfs}
                                quantFilters={quantFilters}
                            />
                        ) : (
                            <div className="glass-card rounded-2xl p-12 text-center text-slate-500 dark:text-slate-400">
                                <p className="text-lg">暫無選股資料</p>
                            </div>
                        )
                    }
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
                            <RankingTrendChart data={rankingHistory} />
                            <ChangeImpactChart logs={logs} />
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <ClockIcon className="w-5 h-5 text-indigo-500" />
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">近期異動紀錄</h3>
                                </div>
                                <DiffLedger logs={logs} />
                            </div>
                        </div>
                    }
                />
            </React.Suspense>
        </div>
    );
}
