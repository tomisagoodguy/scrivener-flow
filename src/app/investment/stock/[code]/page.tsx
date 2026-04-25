'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { Loader2, Briefcase, ArrowLeft, ArrowRight } from 'lucide-react';
import { StockChart } from '@/components/features/investment/StockChart';
import { RevenueChart } from '@/components/features/investment/RevenueChart';
import { ChipsChart } from '@/components/features/investment/ChipsChart';
import { ShareholderFlowChart } from '@/components/features/investment/ShareholderFlowChart';
import { InvestmentTrustChart } from '@/components/features/investment/InvestmentTrustChart';
import { BrokerChart } from '@/components/features/investment/BrokerChart';
import { StockDashboardNav } from '@/components/features/investment/StockDashboardNav';
import { EtfWeightHistoryChart } from '@/components/features/investment/EtfWeightHistoryChart';
import { useStockDashboard } from '@/hooks/investment/useStockDashboard';
import { StockPoolMetrics } from '@/components/features/investment/StockPoolMetrics';
import { StockDetailSections } from '@/components/features/investment/StockDetailSections';

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

export default function StockPage() {
    const params = useParams();
    const stockCode = params.code as string;
    const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

    const {
        stockName, prevStock, nextStock, currentIndex, totalCount, chipRank, retailRank, handleNavigate, quantMetrics,
        priceData, revenueData, monthlyPriceData, chipsData, brokerData,
        etfWeightHistory, etfWeightHistoryLoading, holdingEtfs,
        loading, priceLoading, revenueLoading, chipsLoading, brokerLoading,
        priceError, revenueError, chipsError, brokerError,
    } = useStockDashboard(stockCode);

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
                    <h2 className="text-sm font-bold mb-2 text-slate-800 dark:text-slate-200">🎯 籌碼分析 - 股權分散</h2>
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
                            <h2 className="text-sm font-bold mb-2 text-slate-800 dark:text-slate-200">🔥 大戶籌碼流向</h2>
                            <div className="flex-1 min-h-0">
                                {chipsData.length > 0 ? <ShareholderFlowChart data={chipsData} type="large" /> : <div className="flex items-center justify-center h-full text-slate-400 text-sm">無大戶流向數據</div>}
                            </div>
                        </div>
                        <div className="flex flex-col h-full overflow-hidden border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-4 md:pt-0 md:pl-6">
                            <h2 className="text-sm font-bold mb-2 text-slate-800 dark:text-slate-200">💎 散戶籌碼流向</h2>
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
