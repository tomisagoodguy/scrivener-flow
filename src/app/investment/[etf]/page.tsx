import { createClient } from '@/lib/supabase/server';
import { ClockIcon } from 'lucide-react';
import { HoldingsTable } from '@/components/features/investment/HoldingsTable';
import { DiffLedger } from '@/components/features/investment/DiffLedger';
import { HoldingsOverview } from '@/components/features/investment/HoldingsOverview';
import { ChangeImpactChart } from '@/components/features/investment/ChangeImpactChart';
import { DrilldownTabs } from '@/components/features/investment/DrilldownTabs';
import { AIAnalysisPromptButton } from '@/components/features/investment/AIAnalysisPromptButton';
import { EtfSelector } from '@/components/features/investment/EtfSelector';
import { EtfNewsPanel } from '@/components/features/investment/EtfNewsPanel';
import { EtfHeroSection } from '@/components/features/investment/EtfHeroSection';
import React from 'react';
import { Holding } from '@/types/investment';
import { redirect } from 'next/navigation';
import { ETF_CODES, getEtfMeta } from '@/lib/investment/etfRegistry';
import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';

// Fetch single-ETF holdings with price fallback and revenue data
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

    return { holdings: formattedHoldings, updatedAt: targetUpdatedAt, dataDate: targetDate };
}

async function fetchQuantFilters(stockCodes: string[]): Promise<Record<string, {
    momentum_60d: number | null;
    momentum_pass: boolean;
    it_buy_5d: number | null;
    it_buy_5d_pass: boolean;
    rev_ma3: number | null;
    rev_ma3_new_high: boolean;
    filter_score: number;
}>> {
    if (stockCodes.length === 0) return {};
    const supabase = await createClient();

    const { data: recentPriceData } = await supabase
        .from('stock_prices_daily')
        .select('stock_code, data_date, close, it_buy')
        .in('stock_code', stockCodes)
        .order('data_date', { ascending: false })
        .limit(10 * stockCodes.length);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 100);
    const cutoffStr = cutoffDate.toISOString().slice(0, 10);

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

    const oldCloseMap: Record<string, number> = {};
    for (const row of oldPriceData ?? []) {
        if (!oldCloseMap[row.stock_code] && Number(row.close) > 0) {
            oldCloseMap[row.stock_code] = Number(row.close);
        }
    }

    const recentPricesMap: Record<string, typeof recentPriceData> = {};
    for (const row of recentPriceData ?? []) {
        if (!recentPricesMap[row.stock_code]) recentPricesMap[row.stock_code] = [];
        recentPricesMap[row.stock_code]!.push(row);
    }

    const result: Record<string, {
        momentum_60d: number | null;
        momentum_pass: boolean;
        it_buy_5d: number | null;
        it_buy_5d_pass: boolean;
        rev_ma3: number | null;
        rev_ma3_new_high: boolean;
        filter_score: number;
    }> = {};

    for (const code of stockCodes) {
        const prices = (recentPricesMap[code] ?? [])
            .sort((a, b) => new Date(b.data_date).getTime() - new Date(a.data_date).getTime());

        let momentum_60d: number | null = null;
        let momentum_pass = false;
        let it_buy_5d: number | null = null;
        let it_buy_5d_pass = false;

        if (prices.length >= 1) {
            const latestClose = Number(prices[0].close);
            const oldClose = oldCloseMap[code];

            if (latestClose > 0 && oldClose && oldClose > 0) {
                momentum_60d = Number(((latestClose / oldClose - 1) * 100).toFixed(2));
                momentum_pass = momentum_60d > 0;
            }

            const itBuys = prices.slice(0, 5).map(p => Number(p.it_buy || 0));
            it_buy_5d = itBuys.reduce((a, b) => a + b, 0);
            it_buy_5d_pass = it_buy_5d > 0;
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

        const filter_score = (momentum_pass ? 1 : 0) + (it_buy_5d_pass ? 1 : 0) + (rev_ma3_new_high ? 1 : 0);
        result[code] = { momentum_60d, momentum_pass, it_buy_5d, it_buy_5d_pass, rev_ma3, rev_ma3_new_high, filter_score };
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

async function getEtfNews(etfCode: string) {
    const supabase = await createClient();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 5);
    const { data } = await supabase
        .from('etf_news')
        .select('stock_code, pub_date, pub_time, title, source, url')
        .eq('etf_code', etfCode)
        .gte('pub_date', cutoff.toISOString().slice(0, 10))
        .order('pub_date', { ascending: false })
        .order('stock_code', { ascending: true });
    return data ?? [];
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

export default async function InvestmentEtfDrilldownPage({
    params,
    searchParams,
}: {
    params: Promise<{ etf: string }>;
    searchParams: Promise<{ tab?: string }>;
}) {
    const { etf } = await params;
    await searchParams;

    if (!(ETF_CODES as string[]).includes(etf)) {
        redirect('/investment');
    }

    const etfCode = etf;
    const etfMeta = getEtfMeta(etfCode);

    const { holdings, updatedAt, dataDate } = await getHoldings(etfCode);
    const supabaseForPnl = await createClient();
    const [logs, rankingHistory, quantFilters, news, pnlSeriesResult, positionsResult, todayDiffsResult] = await Promise.all([
        getDiffLogs(etfCode),
        getRankingHistory(etfCode),
        fetchQuantFilters(holdings.map(h => h.stock_code)),
        getEtfNews(etfCode),
        supabaseForPnl
            .from('etf_pnl_series')
            .select('data_date, total_mv, total_cost, total_pnl, total_pnl_pct, total_shares')
            .eq('etf_code', etfCode)
            .order('data_date', { ascending: true })
            .limit(365),
        supabaseForPnl
            .from('etf_position_summary')
            .select('stock_code, cost_basis, mv_now, pnl, pnl_pct, delta_days, first_entry_date, entry_price, curr_price, curr_shares, is_active, exit_date, realized_pnl_pct')
            .eq('etf_code', etfCode)
            .eq('data_date', dataDate ?? '')
            .limit(200),
        supabaseForPnl
            .from('etf_diff_logs')
            .select('etf_code, data_date, stock_code, stock_name, change_type, diff_shares, curr_shares, prev_weight, curr_weight')
            .eq('etf_code', etfCode)
            .eq('data_date', dataDate ?? '')
            .limit(100),
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
                    <div className="mb-2">
                        <Link
                            href="/investment"
                            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors"
                        >
                            <ArrowLeftIcon className="w-4 h-4" />
                            返回選股池
                        </Link>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        {etfMeta?.shortCode ?? etfCode} 持股明細
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        {etfMeta?.name} · {etfMeta?.manager} · 持股明細與異動紀錄
                    </p>
                    <div className="mt-3">
                        <EtfSelector currentEtf={etfCode} mode="drilldown" />
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

            <EtfNewsPanel news={news} />

            <EtfHeroSection
                etfCode={etfCode}
                etfName={etfMeta?.name ?? etfCode}
                pnlSeries={(pnlSeriesResult.data ?? []).map(r => ({
                    data_date: r.data_date,
                    total_pnl: Number(r.total_pnl),
                    total_cost: Number(r.total_cost),
                    total_pnl_pct: Number(r.total_pnl_pct),
                    total_shares: Number(r.total_shares),
                }))}
            />

            <React.Suspense fallback={<div className="h-96 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" />}>
                <DrilldownTabs
                    holdingsContent={
                        <div className="w-full space-y-6">
                            <HoldingsOverview data={holdingsWithFilters} />
                            <HoldingsTable initialData={holdingsWithFilters} />
                        </div>
                    }
                    historyData={rankingHistory}
                    ledgerContent={
                        <div className="w-full space-y-8">
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
                    todayDiffs={(todayDiffsResult.data ?? []) as Parameters<typeof DrilldownTabs>[0]['todayDiffs']}
                    positions={(positionsResult.data ?? []).map(p => ({
                        ...p,
                        stock_name: undefined,
                        cost_basis: Number(p.cost_basis),
                        mv_now: Number(p.mv_now),
                        pnl: Number(p.pnl),
                        pnl_pct: Number(p.pnl_pct),
                        delta_days: p.delta_days ?? 0,
                        entry_price: p.entry_price != null ? Number(p.entry_price) : null,
                        curr_price: p.curr_price != null ? Number(p.curr_price) : null,
                        curr_shares: Number(p.curr_shares),
                        realized_pnl_pct: p.realized_pnl_pct != null ? Number(p.realized_pnl_pct) : null,
                    }))}
                />
            </React.Suspense>
        </div>
    );
}
