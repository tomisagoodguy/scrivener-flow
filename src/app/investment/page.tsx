import { createClient } from '@/lib/supabase/server';

export const revalidate = 3600;
import { InvestmentTabs } from '@/components/features/investment/InvestmentTabs';
import { StockPickerHub } from '@/components/features/investment/StockPickerHub';
import { GoldenGrowthZone } from '@/components/features/investment/GoldenGrowthZone';
import { DiffLedger } from '@/components/features/investment/DiffLedger';
import { EtfComparePanel, type OverlapData, type EtfData } from '@/components/features/investment/EtfComparePanel';
import { getGoldenZoneStats } from '@/app/actions/revenueLabActions';
import { ClockIcon } from 'lucide-react';
import React from 'react';
import { Holding, DiffLog } from '@/types/investment';
import { ETF_REGISTRY, ETF_CODES, getEtfMeta } from '@/lib/investment/etfRegistry';
import Link from 'next/link';
import { ConsensusPanel, type ConsensusRow } from '@/components/features/investment/ConsensusPanel';
import { getAllHoldings, buildUnionHoldings } from '@/lib/investment/holdingsUtils';
import { getEtfOverviewStats } from '@/lib/investment/etfOverviewStats';
import { getActiveEtfCodes } from '@/lib/investment/activeEtfs';
import { EtfOverviewGrid } from '@/components/features/investment/EtfOverviewGrid';
import { fetchQuantFiltersBatched } from '@/lib/investment/quantFilters';
import { fetchSectorCategoryMap } from '@/lib/investment/sectorUtils';
import ExcelDownloadButton from '@/components/features/investment/ExcelDownloadButton';
import { PipelineMonitor } from '@/components/features/investment/PipelineMonitor';
import { DailyFlowPanel } from '@/components/features/investment/DailyFlowPanel';
import { PreMarketGuidePair } from '@/components/features/investment/PreMarketGuidePair';
import { getConsensusSignals } from '@/app/actions/getConsensusSignals';

// ── 資料層 ──────────────────────────────────────────────────────────────────

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

    const seen = new Set<string>();
    const uniqueLogs = logsData.filter(log => {
        const key = `${log.etf_code}|${log.data_date}|${log.stock_code}|${log.change_type}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    const industryMap = await fetchSectorCategoryMap([...new Set(uniqueLogs.map(l => l.stock_code))]);

    return uniqueLogs.map(l => ({
        ...l,
        industry: industryMap[l.stock_code] || undefined,
        rank: null,
    })) as DiffLog[];
}

async function getCompareData(): Promise<{ etfs: EtfData[]; overlap: OverlapData } | null> {
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

    const activeCodes = [...new Set((allHoldings ?? []).map(h => h.etf_code))];

    const etfs = activeCodes.map((etf_code) => {
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

    const byCount: Record<number, string[]> = {};
    for (const [code, etfList] of Object.entries(stockEtfMap)) {
        const n = etfList.length;
        if (n >= 2) {
            if (!byCount[n]) byCount[n] = [];
            byCount[n].push(code);
        }
    }

    return { etfs, overlap: { byCount, totalEtfs: activeCodes.length } };
}

async function fetchLatestSignals(): Promise<Record<string, { strength: 1 | 2 | 3; type: string }>> {
    const supabase = await createClient();
    const { data } = await supabase
        .from('etf_signals')
        .select('stock_code, signal_type, strength, data_date')
        .order('data_date', { ascending: false })
        .order('strength', { ascending: false })
        .limit(500);

    const map: Record<string, { strength: 1 | 2 | 3; type: string }> = {};
    for (const row of data ?? []) {
        if (!map[row.stock_code]) {
            map[row.stock_code] = { strength: row.strength as 1 | 2 | 3, type: row.signal_type };
        }
    }
    return map;
}

// ── 頁面 ──────────────────────────────────────────────────────────────────────

export default async function InvestmentPoolPage() {
    const { byEtf, latestDate } = await getAllHoldings();
    const unionHoldings = buildUnionHoldings(byEtf);
    const allCodes = unionHoldings.map(h => h.stock_code);

    const [quantFilters, allLogs, goldenZoneStats, compareData, consensusResult, signals, industryMap, rawConsensus, overviewStats, activeCodeList] = await Promise.all([
        fetchQuantFiltersBatched(allCodes),
        getAllDiffLogs(),
        getGoldenZoneStats(),
        getCompareData(),
        fetchConsensusData(),
        fetchLatestSignals(),
        fetchSectorCategoryMap(allCodes),
        getConsensusSignals().catch(() => ({ signals: [], date: null })),
        getEtfOverviewStats(),
        getActiveEtfCodes(),
    ]);

    // 只在 listing / 導覽介面隱藏無資料 ETF；registry 與 pipeline 不受影響。
    const activeCodes = new Set(activeCodeList);

    const fundConsensusMap: Record<string, { consensus_count: number; fund_consec_days: number }> = {};
    for (const s of rawConsensus.signals) {
        fundConsensusMap[s.stock_id] = {
            consensus_count: s.consensus_count,
            fund_consec_days: s.fund_consec_days,
        };
    }

    const unionWithFilters = unionHoldings.map(h => ({
        ...h,
        ...quantFilters[h.stock_code],
    })) as Holding[];

    // 為 StockPickerHub 準備 etfs 格式（含 revenue_yoy）；排除無資料 ETF
    const etfsForPicker = ETF_REGISTRY.filter(entry => activeCodes.has(entry.code)).map(entry => ({
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
            amount: h.amount ?? null,
            margin_ratio: h.margin_ratio ?? null,
            is_high_5d: h.is_high_5d ?? null,
            is_high_20d: h.is_high_20d ?? null,
            is_high_200d: h.is_high_200d ?? null,
            volatility: h.volatility ?? null,
            industry: industryMap[h.stock_code] ?? null,
        })),
    }));

    const displayDate = latestDate
        ? new Date(latestDate).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' })
        : 'N/A';

    return (
        <div id="investment-page-content" className="container mx-auto py-8 space-y-8 transition-[padding-right] duration-300 ease-in-out">
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
                    <PipelineMonitor />
                    <ExcelDownloadButton />
                </div>
            </div>

            {/* ETF 深潛快速入口 */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-500 dark:text-slate-400">深潛明細：</span>
                {ETF_REGISTRY.filter(etf => activeCodes.has(etf.code)).map(etf => (
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

            {/* 連續加減碼入口 */}
            <Link
                href="/investment/streaks"
                className="glass-card rounded-2xl p-4 flex items-center justify-between gap-3 hover:scale-[1.01] transition-transform group"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center text-lg">
                        🔥
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">連續加減碼</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            個股被主動 ETF 連續同向加減碼了幾個回報日 — 持續性買賣意圖
                        </p>
                    </div>
                </div>
                <span className="text-slate-400 group-hover:translate-x-0.5 transition-transform">→</span>
            </Link>

            {/* 經理人視角入口 */}
            <Link
                href="/investment/manager"
                className="glass-card rounded-2xl p-4 flex items-center justify-between gap-3 hover:scale-[1.01] transition-transform group"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center text-lg">
                        🧑‍💼
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">經理人視角</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            同一位經理人的 ETF（日頻）vs 共同基金（月頻）雙軌持股對照與訊號
                        </p>
                    </div>
                </div>
                <span className="text-slate-400 group-hover:translate-x-0.5 transition-transform">→</span>
            </Link>

            <React.Suspense fallback={<div className="h-24 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" />}>
                <PreMarketGuidePair />
            </React.Suspense>

            <React.Suspense fallback={<div className="h-96 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" />}>
                <InvestmentTabs
                    overviewContent={<EtfOverviewGrid stats={overviewStats} />}
                    stockPickerContent={
                        <StockPickerHub etfs={etfsForPicker} quantFilters={quantFilters} signals={signals} fundConsensusMap={fundConsensusMap} />
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
                    flowContent={
                        <DailyFlowPanel totalEtfs={ETF_REGISTRY.length} />
                    }
                />
            </React.Suspense>
        </div>
    );
}
