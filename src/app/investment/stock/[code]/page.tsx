'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Briefcase, ArrowLeft, ArrowRight } from 'lucide-react';
import { StockChart } from '@/components/features/investment/StockChart';
import { RevenueChart } from '@/components/features/investment/RevenueChart';
import { ChipsChart } from '@/components/features/investment/ChipsChart';
import { ShareholderFlowChart } from '@/components/features/investment/ShareholderFlowChart';
import { InvestmentTrustChart } from '@/components/features/investment/InvestmentTrustChart';
import { BrokerChart } from '@/components/features/investment/BrokerChart';
import { StockDashboardNav } from '@/components/features/investment/StockDashboardNav';
import { EtfWeightHistoryChart } from '@/components/features/investment/EtfWeightHistoryChart';
import { ManagerPnlSection } from '@/components/features/investment/ManagerPnlSection';
import { useStockDashboard } from '@/hooks/investment/useStockDashboard';
import { StockPoolMetrics } from '@/components/features/investment/StockPoolMetrics';
import { StockDetailSections } from '@/components/features/investment/StockDetailSections';
import { createClient } from '@/lib/supabase/client';

function SideNavButton({ stock, direction, onNavigate }: {
    stock: { code: string; name: string } | null;
    direction: 'prev' | 'next';
    onNavigate: (code: string) => void;
}) {
    const isNext = direction === 'next';
    if (!stock) return null;
    return (
        <button
            onClick={() => onNavigate(stock.code)}
            title={`${isNext ? '下一檔' : '上一檔'} ${stock.code} ${stock.name}`}
            className={`fixed top-1/2 -translate-y-1/2 z-40 group flex items-center overflow-hidden
                transition-all duration-300 ease-out shadow-lg hover:shadow-2xl
                ${isNext
                    ? 'right-0 flex-row-reverse rounded-l-2xl bg-gradient-to-l from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500'
                    : 'left-0 flex-row rounded-r-2xl bg-gradient-to-r from-slate-600 to-slate-500 hover:from-slate-500 hover:to-slate-400'
                }
                text-white py-5 px-3`}
        >
            {/* 箭頭圖示，帶圓形背景 */}
            <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-white/20 group-hover:bg-white/30 transition-colors">
                {isNext ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            </span>

            {/* 展開的股票資訊 */}
            <span className={`flex flex-col max-w-0 overflow-hidden group-hover:max-w-[5.5rem] transition-all duration-300 ease-out
                ${isNext ? 'items-end mr-0 group-hover:mr-2.5' : 'items-start ml-0 group-hover:ml-2.5'}`}
            >
                <span className="whitespace-nowrap text-[10px] font-mono opacity-75 leading-none mb-0.5">
                    {stock.code}
                </span>
                <span className="whitespace-nowrap text-xs font-semibold leading-none">
                    {stock.name}
                </span>
                <span className="whitespace-nowrap text-[9px] opacity-60 mt-1 leading-none">
                    {isNext ? '下一檔 →' : '← 上一檔'}
                </span>
            </span>
        </button>
    );
}

function ChartPanel({ loading, error, children, emptyText }: {
    loading: boolean;
    error: string | null;
    children: React.ReactNode;
    emptyText?: string;
}) {
    if (loading) return (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm z-10">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
    );
    if (error) return <div className="flex items-center justify-center h-full text-red-500 text-sm">{error}</div>;
    if (emptyText) return <div className="flex items-center justify-center h-full text-slate-400 text-sm">{emptyText}</div>;
    return <>{children}</>;
}

const SOURCE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    '共識買進':  { bg: 'bg-rose-50 dark:bg-rose-900/20',   text: 'text-rose-700 dark:text-rose-300',   border: 'border-rose-200 dark:border-rose-700' },
    '集中加碼':  { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-700' },
    '共識賣':    { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-700' },
    '瑤姐加碼':  { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-700' },
    '瑤姐新建倉':{ bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-700' },
    '瑤姐減碼':  { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-700' },
    '瑤姐出清':  { bg: 'bg-slate-100 dark:bg-slate-800',   text: 'text-slate-600 dark:text-slate-300',   border: 'border-slate-300 dark:border-slate-600' },
    '共識+瑤姐': { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-600' },
    '雙重信號':  { bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-200 dark:border-violet-700' },
};

function SourceNav({ from, rank, list, names, cats }: {
    from: string | null; rank: string | null; list: string | null;
    names: string | null; cats: string | null;
}) {
    if (!from || !list) return null;
    const codes = list.split(',').filter(Boolean);
    const nameArr = names ? names.split(',') : [];
    const catArr = cats ? cats.split(',') : [];
    const rankNum = rank ? parseInt(rank, 10) : NaN;
    if (codes.length === 0 || isNaN(rankNum)) return null;

    const colors = SOURCE_COLORS[from] ?? { bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-700' };

    const prevCode = rankNum > 1 ? codes[rankNum - 2] : null;
    const prevName = rankNum > 1 ? (nameArr[rankNum - 2] ?? null) : null;
    const nextCode = rankNum < codes.length ? codes[rankNum] : null;
    const nextName = rankNum < codes.length ? (nameArr[rankNum] ?? null) : null;
    const currentCat = catArr[rankNum - 1] ?? null;

    const makeHref = (code: string, r: number) => {
        let href = `/investment/stock/${code}?from=${encodeURIComponent(from)}&rank=${r}&list=${encodeURIComponent(list)}`;
        if (names) href += `&names=${encodeURIComponent(names)}`;
        if (cats) href += `&cats=${encodeURIComponent(cats)}`;
        return href;
    };

    return (
        <div className={`inline-flex items-center gap-1 rounded-full border text-xs font-semibold overflow-hidden ${colors.border}`}>
            {prevCode ? (
                <Link
                    href={makeHref(prevCode, rankNum - 1)}
                    className={`flex items-center gap-1 px-2.5 py-1 ${colors.bg} ${colors.text} hover:opacity-80 transition-opacity`}
                >
                    <ArrowLeft className="w-3 h-3" />
                    {prevName && <span>{prevName}</span>}
                    <span className="font-mono opacity-60">{prevCode}</span>
                </Link>
            ) : (
                <span className={`px-2.5 py-1 opacity-30 ${colors.bg} ${colors.text}`}>
                    <ArrowLeft className="w-3 h-3" />
                </span>
            )}

            <span className={`px-3 py-1 ${colors.bg} ${colors.text} border-x ${colors.border} flex items-center gap-1.5`}>
                {from} <span className="opacity-60">#{rankNum}</span>
                <span className="opacity-40">/ {codes.length}</span>
                {currentCat && (
                    <span className="opacity-75 bg-white/40 px-1.5 py-0.5 rounded-full text-[10px]">{currentCat}</span>
                )}
            </span>

            {nextCode ? (
                <Link
                    href={makeHref(nextCode, rankNum + 1)}
                    className={`flex items-center gap-1 px-2.5 py-1 ${colors.bg} ${colors.text} hover:opacity-80 transition-opacity`}
                >
                    <span className="font-mono opacity-60">{nextCode}</span>
                    {nextName && <span>{nextName}</span>}
                    <ArrowRight className="w-3 h-3" />
                </Link>
            ) : (
                <span className={`px-2.5 py-1 opacity-30 ${colors.bg} ${colors.text}`}>
                    <ArrowRight className="w-3 h-3" />
                </span>
            )}
        </div>
    );
}

const NOW = Date.now();

export default function StockPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const stockCode = params.code as string;
    const sourceFrom = searchParams.get('from');
    const [isDisposal, setIsDisposal] = useState(false);

    useEffect(() => {
        if (!stockCode) return;
        const supabase = createClient();
        supabase
            .from('etf_holdings_snapshot')
            .select('is_disposal')
            .eq('stock_code', stockCode)
            .order('data_date', { ascending: false })
            .limit(1)
            .then(({ data }) => {
                setIsDisposal(data?.[0]?.is_disposal === true);
            });
    }, [stockCode]);
    const sourceRank = searchParams.get('rank');
    const sourceList = searchParams.get('list');
    const [hitContext] = useState<{ names: string[]; cats: string[] } | null>(() => {
        if (sourceFrom !== '⚡命中區') return null;
        try {
            const stored = sessionStorage.getItem('hit-zone-context');
            return stored ? (JSON.parse(stored) as { names: string[]; cats: string[] }) : null;
        } catch {
            return null;
        }
    });
    const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

    const {
        stockName, prevStock, nextStock, currentIndex, totalCount, chipRank, retailRank, handleNavigate, quantMetrics,
        priceData, revenueData, monthlyPriceData, chipsData, brokerData,
        etfWeightHistory, etfWeightHistoryLoading, holdingEtfs,
        loading, priceLoading, revenueLoading, chipsLoading, brokerLoading,
        priceError, revenueError, chipsError, brokerError,
    } = useStockDashboard(stockCode);

    const chipsLatestDate = useMemo(() => {
        if (!chipsData || chipsData.length === 0) return null;
        const latest = chipsData.reduce((a, b) => (a.data_date > b.data_date ? a : b)).data_date;
        const daysSince = Math.floor((NOW - new Date(latest).getTime()) / 86400000);
        return { label: latest.slice(5).replace('-', '/'), stale: daysSince > 10 };
    }, [chipsData]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4">
            {/* 螢幕側邊懸浮導航 */}
            <SideNavButton stock={prevStock} direction="prev" onNavigate={handleNavigate} />
            <SideNavButton stock={nextStock} direction="next" onNavigate={handleNavigate} />

            <StockDashboardNav
                stockCode={stockCode}
                stockName={stockName}
                prevStock={prevStock}
                nextStock={nextStock}
                onNavigate={handleNavigate}
                holdingEtfs={holdingEtfs}
                currentIndex={currentIndex}
                totalCount={totalCount}
                quantMetrics={quantMetrics}
                chipRank={chipRank}
                retailRank={retailRank}
            />

            {isDisposal && (
                <div className="mt-3 mx-1 flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300">
                    <span className="shrink-0 text-base">⚠️</span>
                    此股票目前處於分盤交易（處置）狀態
                </div>
            )}

            <div className="mt-3 mb-1 px-1">
                <SourceNav
                    from={sourceFrom}
                    rank={sourceRank}
                    list={sourceList}
                    names={hitContext ? hitContext.names.join(',') : null}
                    cats={hitContext ? hitContext.cats.join(',') : null}
                />
            </div>

            {!etfWeightHistoryLoading && priceData.length > 0 && (
                <StockPoolMetrics
                    etfWeightHistory={etfWeightHistory}
                    quantMetrics={quantMetrics}
                    priceData={priceData}
                />
            )}

            <StockDetailSections stockCode={stockCode} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-10">
                {/* K線圖 */}
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                    <h2 className="text-sm font-bold mb-2 text-slate-800 dark:text-slate-200">📈 技術分析 - K線圖</h2>
                    <div className="relative h-[calc(100%-2rem)]">
                        <ChartPanel loading={priceLoading} error={priceError}>
                            <StockChart data={priceData} isDarkMode={isDark} />
                        </ChartPanel>
                    </div>
                </div>

                {/* 營收 vs 股價 */}
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                    <h2 className="text-sm font-bold mb-2 text-slate-800 dark:text-slate-200">💰 基本面分析 - 營收 vs 股價</h2>
                    <div className="relative h-[calc(100%-2rem)]">
                        <ChartPanel loading={revenueLoading} error={revenueError} emptyText={revenueData.length === 0 ? '無營收數據' : undefined}>
                            {revenueData.length > 0 && <RevenueChart revenueData={revenueData} priceData={monthlyPriceData} />}
                        </ChartPanel>
                    </div>
                </div>

                {/* 股權分散 */}
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                    <h2 className="text-sm font-bold mb-2 text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        🎯 籌碼分析 - 股權分散
                        {chipsLatestDate && (
                            <span className={`text-xs font-normal px-1.5 py-0.5 rounded ${chipsLatestDate.stale ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                                截至 {chipsLatestDate.label}{chipsLatestDate.stale ? ' ⚠️' : ''}
                            </span>
                        )}
                    </h2>
                    <div className="relative h-[calc(100%-2rem)]">
                        <ChartPanel loading={chipsLoading} error={chipsError} emptyText={chipsData.length === 0 ? '無籌碼數據' : undefined}>
                            {chipsData.length > 0 && <ChipsChart data={chipsData} />}
                        </ChartPanel>
                    </div>
                </div>

                {/* 投信買賣超 */}
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                    <h2 className="text-sm font-bold mb-2 text-slate-800 dark:text-slate-200">🏢 投信買賣超分析</h2>
                    <div className="relative h-[calc(100%-2rem)]">
                        <ChartPanel loading={priceLoading} error={null} emptyText={priceData.length === 0 ? '無投信數據' : undefined}>
                            {priceData.length > 0 && <InvestmentTrustChart data={priceData} isDarkMode={isDark} />}
                        </ChartPanel>
                    </div>
                </div>

                {/* 大戶與散戶流向 */}
                <div className="col-span-1 lg:col-span-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[400px]">
                        <div className="flex flex-col h-full overflow-hidden">
                            <h2 className="text-sm font-bold mb-2 text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                🔥 大戶籌碼流向
                                {chipsLatestDate && (
                                    <span className={`text-xs font-normal px-1.5 py-0.5 rounded ${chipsLatestDate.stale ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                                        截至 {chipsLatestDate.label}{chipsLatestDate.stale ? ' ⚠️' : ''}
                                    </span>
                                )}
                            </h2>
                            <div className="flex-1 min-h-0">
                                {chipsData.length > 0 ? <ShareholderFlowChart data={chipsData} type="large" /> : <div className="flex items-center justify-center h-full text-slate-400 text-sm">無大戶流向數據</div>}
                            </div>
                        </div>
                        <div className="flex flex-col h-full overflow-hidden border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-4 md:pt-0 md:pl-6">
                            <h2 className="text-sm font-bold mb-2 text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                💎 散戶籌碼流向
                                {chipsLatestDate && (
                                    <span className={`text-xs font-normal px-1.5 py-0.5 rounded ${chipsLatestDate.stale ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                                        截至 {chipsLatestDate.label}{chipsLatestDate.stale ? ' ⚠️' : ''}
                                    </span>
                                )}
                            </h2>
                            <div className="flex-1 min-h-0">
                                {chipsData.length > 0 ? <ShareholderFlowChart data={chipsData} type="retail" /> : <div className="flex items-center justify-center h-full text-slate-400 text-sm">無散戶流向數據</div>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 券商分點分析 */}
                <div className="col-span-1 lg:col-span-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                    <h2 className="text-sm font-bold mb-2 text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-amber-500" />
                        主力券商籌碼分析 (Top 15)
                    </h2>
                    <div className="relative h-[400px]">
                        <ChartPanel loading={brokerLoading} error={brokerError ? `${brokerError} (可能暫無資料)` : null} emptyText={brokerData.length === 0 ? '尚無券商分析資料' : undefined}>
                            {brokerData.length > 0 && <BrokerChart data={brokerData} />}
                        </ChartPanel>
                    </div>
                </div>

                {/* ETF 持倉歷史 */}
                {!etfWeightHistoryLoading && (
                    <EtfWeightHistoryChart
                        stockCode={stockCode}
                        data={etfWeightHistory}
                    />
                )}

                {/* Task 5.1–5.3: 經理人損益區塊（ETF 持倉歷史圖表下方） */}
                <ManagerPnlSection stockCode={stockCode} />
            </div>

            {/* 底部導航列 */}
            <div className="flex items-center justify-between gap-4 py-4 border-t border-slate-200 dark:border-slate-800 mt-2">
                <button
                    disabled={!prevStock}
                    onClick={() => prevStock && handleNavigate(prevStock.code)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    {prevStock ? <><span className="font-mono text-xs text-slate-400">{prevStock.code}</span><span>{prevStock.name}</span></> : '已是第一檔'}
                </button>

                {currentIndex != null && totalCount != null && totalCount > 0 && (
                    <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
                        {currentIndex} / {totalCount}
                    </span>
                )}

                <button
                    disabled={!nextStock}
                    onClick={() => nextStock && handleNavigate(nextStock.code)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-700 text-white disabled:text-slate-400 text-sm font-medium disabled:cursor-not-allowed transition-colors"
                >
                    {nextStock ? <><span>{nextStock.name}</span><span className="font-mono text-xs opacity-75">{nextStock.code}</span></> : '已是最後一檔'}
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
