import { createClient } from '@/lib/supabase/server';
import { InvestmentTabs } from '@/components/features/investment/InvestmentTabs';
import { StockPickerHub } from '@/components/features/investment/StockPickerHub';
import { GoldenGrowthZone } from '@/components/features/investment/GoldenGrowthZone';
import { DiffLedger } from '@/components/features/investment/DiffLedger';
import { EtfComparePanel } from '@/components/features/investment/EtfComparePanel';
import { getGoldenZoneStats } from '@/app/actions/revenueLabActions';
import { ClockIcon, FlaskConicalIcon, HistoryIcon } from 'lucide-react';
import React from 'react';
import { Holding, DiffLog } from '@/types/investment';
import { ETF_REGISTRY, ETF_CODES, getEtfMeta } from '@/lib/investment/etfRegistry';
import Link from 'next/link';
import { ConsensusPanel, type ConsensusRow } from '@/components/features/investment/ConsensusPanel';

// ── 資料層 ──────────────────────────────────────────────────────────────────

async function getHoldingsForEtf(etfCode: string, supabase: Awaited<ReturnType<typeof createClient>>) {
    const { data: dateCandidates } = await supabase
        .from('etf_holdings_snapshot')
        .select('data_date, updated_at')
        .eq('etf_code', etfCode)
        .order('data_date', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(2);

    if (!dateCandidates || dateCandidates.length === 0) return { holdings: [], dataDate: null };

    const fetchForDate = async (date: string) => {
        const { data } = await supabase
            .from('etf_holdings_snapshot')
            .select('*')
            .eq('etf_code', etfCode)
            .eq('data_date', date)
            .order('weight', { ascending: false });
        return data || [];
    };

    let targetDate = dateCandidates[0].data_date;
    let data = await fetchForDate(targetDate);

    const validPriceCount = data.filter(h => h.price && h.price > 0).length;
    if (data.length > 0 && (validPriceCount / data.length) <= 0.5 && dateCandidates.length > 1) {
        targetDate = dateCandidates[1].data_date;
        data = await fetchForDate(targetDate);
    }

    return { holdings: data, dataDate: targetDate };
}

async function getAllHoldings(): Promise<{
    byEtf: Record<string, Holding[]>;
    latestDate: string | null;
}> {
    const supabase = await createClient();

    const results = await Promise.all(
        ETF_CODES.map(code => getHoldingsForEtf(code, supabase))
    );

    // 收集所有 stock_code 做批次查詢
    const allCodes = [...new Set(results.flatMap(r => r.holdings.map(h => h.stock_code)))];

    const [industryData, revData, priceData] = await Promise.all([
        supabase.from('stock_basic_info').select('stock_code, industry').in('stock_code', allCodes),
        supabase.from('stock_revenue_monthly')
            .select('stock_code, data_date, revenue_yoy, revenue_mom')
            .in('stock_code', allCodes)
            .order('data_date', { ascending: false }),
        supabase.from('stock_prices_daily')
            .select('stock_code, data_date, close, amount, margin_ratio')
            .in('stock_code', allCodes)
            .order('data_date', { ascending: false })
            .limit(2 * allCodes.length),
    ]);

    const industryMap: Record<string, string> = {};
    industryData.data?.forEach(i => { industryMap[i.stock_code] = i.industry; });

    const revMap: Record<string, { date: string; yoy: number; mom: number }> = {};
    revData.data?.forEach(r => {
        if (!revMap[r.stock_code]) {
            revMap[r.stock_code] = { date: r.data_date.substring(0, 7), yoy: r.revenue_yoy, mom: r.revenue_mom };
        }
    });

    const priceMap: Record<string, { price: number; change_percent: number; amount: number | null; margin_ratio: number | null }> = {};
    const grouped: Record<string, typeof priceData.data> = {};
    for (const row of priceData.data ?? []) {
        if (!grouped[row.stock_code]) grouped[row.stock_code] = [];
        if (grouped[row.stock_code]!.length < 2) grouped[row.stock_code]!.push(row);
    }
    for (const [code, rows] of Object.entries(grouped)) {
        if (!rows || rows.length === 0) continue;
        const latest = rows[0];
        const prev = rows[1];
        const close = Number(latest.close ?? 0);
        const prevClose = prev ? Number(prev.close ?? 0) : 0;
        priceMap[code] = {
            price: close,
            change_percent: prevClose > 0 ? Number(((close / prevClose - 1) * 100).toFixed(2)) : 0,
            amount: latest.amount ? Number(latest.amount) : null,
            margin_ratio: latest.margin_ratio ? Number(latest.margin_ratio) : null,
        };
    }

    const byEtf: Record<string, Holding[]> = {};
    let latestDate: string | null = null;

    for (let i = 0; i < ETF_CODES.length; i++) {
        const code = ETF_CODES[i];
        const { holdings, dataDate } = results[i];
        if (dataDate && (!latestDate || dataDate > latestDate)) latestDate = dataDate;

        byEtf[code] = holdings.map(h => {
            const rev = revMap[h.stock_code];
            const p = priceMap[h.stock_code];
            return {
                ...h,
                price: h.price ?? p?.price ?? null,
                change_percent: h.change_percent ?? p?.change_percent ?? null,
                amount: h.amount ?? p?.amount ?? null,
                margin_ratio: h.margin_ratio ?? p?.margin_ratio ?? null,
                industry: industryMap[h.stock_code] || '未知',
                revenue_month: rev?.date || null,
                revenue_yoy: rev?.yoy ?? null,
                revenue_mom: rev?.mom ?? null,
            } as Holding;
        });
    }

    return { byEtf, latestDate };
}

function buildUnionHoldings(byEtf: Record<string, Holding[]>): Holding[] {
    const map = new Map<string, Holding>();
    for (const [, holdings] of Object.entries(byEtf)) {
        for (const h of holdings) {
            const existing = map.get(h.stock_code);
            if (!existing || (h.weight ?? 0) > (existing.weight ?? 0)) {
                map.set(h.stock_code, h);
            }
        }
    }
    return Array.from(map.values());
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
                const avg = (Number(revs[i]?.revenue || 0) + Number(revs[i + 1]?.revenue || 0) + Number(revs[i + 2]?.revenue || 0)) / 3;
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

async function fetchConsensusData(): Promise<{ data: ConsensusRow[]; date: string }> {
    const supabase = await createClient();

    const { data: latest } = await supabase
        .from('etf_stock_overlap')
        .select('data_date')
        .order('data_date', { ascending: false })
        .limit(1);

    if (!latest || latest.length === 0) return { data: [], date: '' };
    const queryDate: string = latest[0].data_date;

    const { data: overlapData } = await supabase
        .from('etf_stock_overlap')
        .select('stock_code, etf_count, total_weight, etf_list')
        .eq('data_date', queryDate)
        .gte('etf_count', 1)
        .order('etf_count', { ascending: false })
        .order('total_weight', { ascending: false })
        .limit(200);

    if (!overlapData || overlapData.length === 0) return { data: [], date: queryDate };

    const stockCodes = overlapData.map((r) => r.stock_code);
    const { data: nameData } = await supabase
        .from('etf_holdings_snapshot')
        .select('stock_code, stock_name')
        .in('stock_code', stockCodes)
        .eq('data_date', queryDate);

    const nameMap: Record<string, string> = {};
    for (const row of nameData ?? []) {
        nameMap[row.stock_code] = row.stock_name;
    }

    const data: ConsensusRow[] = overlapData.map((row) => ({
        stock_code: row.stock_code,
        stock_name: nameMap[row.stock_code] ?? '',
        etf_count: row.etf_count,
        total_weight: Number(row.total_weight),
        etf_list: (row.etf_list as ConsensusRow['etf_list']) ?? [],
    }));

    return { data, date: queryDate };
}

async function getAllDiffLogs(): Promise<DiffLog[]> {
    const supabase = await createClient();

    const { data: logsData } = await supabase
        .from('etf_diff_logs')
        .select('id, etf_code, data_date, change_type, stock_code, stock_name, diff_shares, diff_weight, description, created_at, prev_shares, curr_shares, prev_weight, curr_weight, is_significant')
        .in('etf_code', ETF_CODES)
        .order('data_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1000);

    if (!logsData || logsData.length === 0) return [];

    const { data: industryData } = await supabase
        .from('stock_basic_info')
        .select('stock_code, industry')
        .in('stock_code', logsData.map(l => l.stock_code));

    const industryMap: Record<string, string> = {};
    industryData?.forEach(i => { industryMap[i.stock_code] = i.industry; });

    return logsData.map(l => ({
        ...l,
        industry: industryMap[l.stock_code] || undefined,
        rank: null,
    })) as DiffLog[];
}

async function getCompareData() {
    const supabase = await createClient();

    const { data: dateRow } = await supabase
        .from('etf_holdings_snapshot')
        .select('data_date')
        .in('etf_code', ETF_CODES)
        .order('data_date', { ascending: false })
        .limit(1);

    const targetDate = dateRow?.[0]?.data_date ?? null;
    if (!targetDate) return null;

    const { data: allHoldings } = await supabase
        .from('etf_holdings_snapshot')
        .select('etf_code, stock_code, stock_name, weight, data_date')
        .in('etf_code', ETF_CODES)
        .eq('data_date', targetDate)
        .order('weight', { ascending: false });

    const { data: aumRows } = await supabase
        .from('etf_aum')
        .select('etf_code, aum_100m_twd, snapshot_date')
        .in('etf_code', ETF_CODES)
        .order('snapshot_date', { ascending: false })
        .limit(ETF_CODES.length * 3);

    const { data: sectorRows } = await supabase
        .from('etf_sectors')
        .select('etf_code, sector_name, weight, snapshot_date')
        .in('etf_code', ETF_CODES)
        .order('snapshot_date', { ascending: false })
        .limit(ETF_CODES.length * 30);

    const stockEtfMap: Record<string, string[]> = {};
    for (const h of allHoldings ?? []) {
        if (!stockEtfMap[h.stock_code]) stockEtfMap[h.stock_code] = [];
        if (!stockEtfMap[h.stock_code].includes(h.etf_code)) {
            stockEtfMap[h.stock_code].push(h.etf_code);
        }
    }

    const etfs = ETF_CODES.map((etf_code) => {
        const meta = getEtfMeta(etf_code);
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
            name: meta?.name ?? etf_code,
            manager: meta?.manager ?? '',
            color: meta?.color ?? '#888888',
            data_date: targetDate,
            holdings,
            aum_100m_twd: latestAum?.aum_100m_twd ?? null,
            sectors,
        };
    });

    const overlap = {
        all3: Object.entries(stockEtfMap).filter(([, l]) => l.length === 3).map(([c]) => c),
        any2: Object.entries(stockEtfMap).filter(([, l]) => l.length === 2).map(([c]) => c),
    };

    return { etfs, overlap };
}

// ── 頁面 ──────────────────────────────────────────────────────────────────────

export default async function InvestmentPoolPage() {
    const { byEtf, latestDate } = await getAllHoldings();
    const unionHoldings = buildUnionHoldings(byEtf);
    const allCodes = unionHoldings.map(h => h.stock_code);

    const [quantFilters, allLogs, goldenZoneStats, compareData, consensusResult] = await Promise.all([
        fetchQuantFilters(allCodes),
        getAllDiffLogs(),
        getGoldenZoneStats(),
        getCompareData(),
        fetchConsensusData(),
    ]);

    const unionWithFilters = unionHoldings.map(h => ({
        ...h,
        ...quantFilters[h.stock_code],
    })) as Holding[];

    // 為 StockPickerHub 準備 etfs 格式（含 revenue_yoy）
    const etfsForPicker = ETF_REGISTRY.map(entry => ({
        etf_code: entry.code,
        name: entry.name,
        color: entry.color,
        holdings: (byEtf[entry.code] ?? []).map((h, idx) => ({
            stock_code: h.stock_code,
            stock_name: h.stock_name,
            weight: h.weight ?? 0,
            rank: idx + 1,
            in_etfs: ETF_CODES.filter(c => byEtf[c]?.some(x => x.stock_code === h.stock_code)),
            revenue_yoy: h.revenue_yoy ?? null,
        })),
    }));

    const displayDate = latestDate
        ? new Date(latestDate).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' })
        : 'N/A';

    return (
        <div className="container mx-auto py-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        主動式 ETF 選股池
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        {ETF_REGISTRY.map(e => e.shortCode).join(' · ')} · 跨 {ETF_REGISTRY.length} 支 ETF 合併分析
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-full text-sm font-medium text-slate-700 dark:text-white">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        資料日期: {displayDate}
                    </div>
                    {/* Task 5.3: Revenue Lab 入口 */}
                    <Link
                        href="/investment/history"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/30 dark:text-slate-400 dark:hover:bg-slate-800/50 transition-colors"
                    >
                        <HistoryIcon className="w-4 h-4" />
                        持倉歷史
                    </Link>
                    <Link
                        href="/investment/revenue-lab"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 transition-colors"
                    >
                        <FlaskConicalIcon className="w-4 h-4" />
                        Revenue Lab
                    </Link>
                </div>
            </div>

            {/* ETF 深潛快速入口 */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-500 dark:text-slate-400">深潛明細：</span>
                {ETF_REGISTRY.map(etf => (
                    <Link
                        key={etf.code}
                        href={`/investment/${etf.code}`}
                        className="px-3 py-1 rounded-full text-xs font-medium border transition-all hover:scale-105"
                        style={{
                            backgroundColor: etf.color + '20',
                            color: etf.color,
                            borderColor: etf.color + '60',
                        }}
                    >
                        {etf.shortCode} · {etf.name}
                    </Link>
                ))}
            </div>

            <React.Suspense fallback={<div className="h-96 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" />}>
                <InvestmentTabs
                    stockPickerContent={
                        <StockPickerHub etfs={etfsForPicker} quantFilters={quantFilters} />
                    }
                    analysisContent={
                        <GoldenGrowthZone
                            data={unionWithFilters}
                            historicalStats={goldenZoneStats?.stats}
                        />
                    }
                    ledgerContent={
                        <div className="w-full space-y-4">
                            <div className="flex items-center gap-2">
                                <ClockIcon className="w-5 h-5 text-indigo-500" />
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">跨 ETF 異動紀錄</h3>
                            </div>
                            <DiffLedger logs={allLogs} showEtfFilter={true} />
                        </div>
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
                    consensusContent={
                        <ConsensusPanel data={consensusResult.data} date={consensusResult.date} />
                    }
                />
            </React.Suspense>
        </div>
    );
}
