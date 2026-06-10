export const revalidate = 3600;

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
import { EtfHeader } from '@/components/features/investment/EtfHeader';
import { EtfStockTradeView } from '@/components/features/investment/EtfStockTradeView';
import { EtfHoldingsPieChart } from '@/components/features/investment/EtfHoldingsPieChart';
import { EtfBuyDonutChart } from '@/components/features/investment/EtfBuyDonutChart';
import React from 'react';
import type { Holding, DiffLog } from '@/types/investment';
import { redirect } from 'next/navigation';
import { ETF_CODES, getEtfMeta } from '@/lib/investment/etfRegistry';
import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';
import { getHoldings, fetchQuantFilters, getRankingHistory, getEtfNews, getDiffLogs, getEtfDrilldownPageData } from '@/lib/investment/etfPageData';
import { getHoldings5DayTrend } from '@/app/actions/getHoldings5DayTrend';
import { Holdings5DayTrend } from '@/components/features/Holdings5DayTrend';

export default async function InvestmentEtfDrilldownPage({
    params, searchParams,
}: {
    params: Promise<{ etf: string }>;
    searchParams: Promise<{ tab?: string; topic?: string }>;
}) {
    const { etf } = await params;
    const { topic } = await searchParams;
    if (!(ETF_CODES as string[]).includes(etf)) redirect('/investment');

    const etfCode = etf;
    const etfMeta = getEtfMeta(etfCode);
    const { holdings, updatedAt, dataDate, meta } = await getHoldings(etfCode, topic ?? null);

    const [logs, rankingHistory, quantFilters, news, drilldown, trendData] = await Promise.all([
        getDiffLogs(etfCode),
        getRankingHistory(etfCode),
        fetchQuantFilters(holdings.map(h => h.stock_code)),
        getEtfNews(etfCode),
        getEtfDrilldownPageData(etfCode, dataDate),
        getHoldings5DayTrend(etfCode),
    ]);

    const holdingsWithFilters = holdings.map(h => ({ ...h, ...quantFilters[h.stock_code] })) as Holding[];
    const displayDate = dataDate ? new Date(dataDate).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' }) : 'N/A';
    const updateTime = updatedAt ? new Date(updatedAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
    const holdingPriceMap = new Map(holdingsWithFilters.map(h => [h.stock_code, h.price as number | null]));
    const todayDiffs = drilldown.todayDiffs.map(d => ({ ...d, amount_亿: d.diff_shares != null && holdingPriceMap.get(d.stock_code) != null ? Math.abs(d.diff_shares) * holdingPriceMap.get(d.stock_code)! / 1e8 : null }));
    const positionMap = new Map(drilldown.latestPositions.map(p => [p.stock_code, p.pnl_pct]));
    const stockTradeHoldings = holdingsWithFilters.map(h => ({ stock_code: h.stock_code, stock_name: h.stock_name as string | null | undefined, weight: h.weight as number | null | undefined, pnl_pct: positionMap.get(h.stock_code) != null ? Number(positionMap.get(h.stock_code)) : null }));
    const todayBuyDiffLogs: DiffLog[] = todayDiffs.filter(d => d.diff_shares != null).map(d => ({ id: `${d.etf_code}-${d.stock_code}-${d.data_date}`, data_date: d.data_date, change_type: d.change_type as DiffLog['change_type'], stock_code: d.stock_code, stock_name: d.stock_name ?? '', diff_shares: d.diff_shares!, diff_weight: d.diff_weight ?? 0, description: '' }));

    return (
        <div className="container mx-auto py-8 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="mb-2">
                        <Link href="/investment" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors">
                            <ArrowLeftIcon className="w-4 h-4" />返回選股池
                        </Link>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{etfMeta?.shortCode ?? etfCode} 持股明細</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">{etfMeta?.name} · {etfMeta?.manager} · 持股明細與異動紀錄</p>
                    <div className="mt-3"><EtfSelector currentEtf={etfCode} mode="drilldown" /></div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-full text-sm font-medium text-slate-700 dark:text-white">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        資料日期: {displayDate} <span className="text-slate-400 dark:text-slate-300 text-xs ml-1">({updateTime})</span>
                    </div>
                    {meta && <EtfHeader dataDate={meta.dataDate} dataSource={meta.dataSource} />}
                    <AIAnalysisPromptButton holdings={holdingsWithFilters} dataDate={displayDate} />
                </div>
            </div>
            <EtfNewsPanel news={news} />
            <EtfHeroSection etfCode={etfCode} etfName={etfMeta?.name ?? etfCode} pnlSeries={drilldown.pnlSeries} />
            <Holdings5DayTrend data={trendData} />
            <React.Suspense fallback={<div className="h-96 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" />}>
                <DrilldownTabs
                    holdingsContent={<div className="w-full space-y-6"><HoldingsOverview data={holdingsWithFilters} /><EtfHoldingsPieChart holdings={holdingsWithFilters.map(h => ({ code: h.stock_code, name: h.stock_name ?? '', weight_pct: h.weight ?? 0 }))} /><HoldingsTable initialData={holdingsWithFilters} /></div>}
                    historyData={rankingHistory}
                    ledgerContent={<div className="w-full space-y-8"><ChangeImpactChart logs={logs} /><div><div className="flex items-center gap-2 mb-4"><ClockIcon className="w-5 h-5 text-indigo-500" /><h3 className="text-xl font-bold text-slate-900 dark:text-white">近期異動紀錄</h3></div><DiffLedger logs={logs} /></div></div>}
                    stockTradeContent={<EtfStockTradeView etfCode={etfCode} holdings={stockTradeHoldings} />}
                    todayDiffs={todayDiffs as Parameters<typeof DrilldownTabs>[0]['todayDiffs']}
                    todayBuyChartContent={<EtfBuyDonutChart key="today-buy-chart" diffLogs={todayBuyDiffLogs} holdings={holdingsWithFilters} prevDiffLogs={drilldown.prevDiffsForChart} dataDate={dataDate ?? undefined} prevDataDate={drilldown.prevDate ?? undefined} />}
                    dataDate={dataDate ?? undefined}
                    prevDate={drilldown.prevDate ?? undefined}
                    positions={drilldown.latestPositions as Parameters<typeof DrilldownTabs>[0]['positions']}
                />
            </React.Suspense>
        </div>
    );
}
