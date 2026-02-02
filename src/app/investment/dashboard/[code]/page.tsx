'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, ChevronLeft, ChevronRight, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StockChart } from '@/components/features/investment/StockChart';
import { RevenueChart } from '@/components/features/investment/RevenueChart';
import { ChipsChart } from '@/components/features/investment/ChipsChart';
import { ShareholderFlowChart } from '@/components/features/investment/ShareholderFlowChart';
import { BrokerChart } from '@/components/features/investment/BrokerChart';
import { PriceData } from '@/lib/investment/indicators';
import type { Holding } from '@/components/features/investment/HoldingsTable';

interface RevenueData {
    data_date: string;
    revenue: number;
    revenue_yoy: number | null;
    revenue_mom: number | null;
}

interface MonthlyPrice {
    month: string;
    avg_price: number;
}

interface ShareholderData {
    data_date: string;
    shareholder_tier: number;
    holder_count: number | null;
    shares_held: number | null;
    custody_ratio: number | null;
}

interface BrokerTransactionData {
    date: string;
    broker_name: string;
    buy_shares: number;
    sell_shares: number;
    net_shares: number;
    buy_amount: number;
    sell_amount: number;
    net_amount: number;
}

/**
 * 股票儀表板全螢幕頁面
 * 使用 Grid 佈局同時顯示所有圖表
 */
export default function StockDashboardPage() {
    const params = useParams();
    const router = useRouter();
    const stockCode = params.code as string;

    // 持股列表與當前位置
    const [holdings, setHoldings] = useState<Holding[]>([]);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [stockName, setStockName] = useState('');

    // 數據狀態
    const [priceData, setPriceData] = useState<PriceData[]>([]);
    const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
    const [monthlyPriceData, setMonthlyPriceData] = useState<MonthlyPrice[]>([]);
    const [chipsData, setChipsData] = useState<ShareholderData[]>([]);
    const [brokerData, setBrokerData] = useState<BrokerTransactionData[]>([]);

    // Loading 狀態
    const [loading, setLoading] = useState(true);
    const [priceLoading, setPriceLoading] = useState(false);
    const [revenueLoading, setRevenueLoading] = useState(false);
    const [chipsLoading, setChipsLoading] = useState(false);
    const [brokerLoading, setBrokerLoading] = useState(false);

    // 錯誤狀態
    const [priceError, setPriceError] = useState<string | null>(null);
    const [revenueError, setRevenueError] = useState<string | null>(null);
    const [chipsError, setChipsError] = useState<string | null>(null);
    const [brokerError, setBrokerError] = useState<string | null>(null);

    // 載入持股列表
    useEffect(() => {
        const fetchHoldings = async () => {
            try {
                const response = await fetch('/api/investment/holdings');
                if (response.ok) {
                    const data = await response.json();
                    setHoldings(data);
                    
                    // 找到當前股票的位置
                    const index = data.findIndex((h: Holding) => h.stock_code === stockCode);
                    setCurrentIndex(index);
                    
                    if (index >= 0) {
                        setStockName(data[index].stock_name);
                    }
                    
                    console.log('🔍 Dashboard Debug:', {
                        totalHoldings: data.length,
                        currentStockCode: stockCode,
                        foundIndex: index,
                        stockName: index >= 0 ? data[index].stock_name : 'Not found'
                    });
                }
            } catch (error) {
                console.error('Failed to fetch holdings:', error);
            }
        };

        fetchHoldings();
    }, [stockCode]);

    useEffect(() => {
        if (stockCode) {
            fetchAllData(stockCode);
        }
    }, [stockCode]);

    const fetchAllData = async (code: string) => {
        setLoading(true);
        setPriceLoading(true);
        setRevenueLoading(true);
        setChipsLoading(true);
        setBrokerLoading(true);

        setPriceError(null);
        setRevenueError(null);
        setChipsError(null);
        setBrokerError(null);

        await Promise.all([
            fetchPriceData(code),
            fetchRevenueData(code),
            fetchChipsData(code),
            fetchBrokerData(code),
        ]);
        setLoading(false);
    };

    const fetchPriceData = async (code: string) => {
        setPriceLoading(true);
        setPriceError(null);
        try {
            const response = await fetch(`/api/investment/prices?code=${code}`);
            if (!response.ok) throw new Error('無法獲取價格數據');
            const data: PriceData[] = await response.json();
            if (data.length === 0) throw new Error('查無歷史數據');
            setPriceData(data);
        } catch (err: any) {
            setPriceError(err.message);
            setPriceData([]);
        } finally {
            setPriceLoading(false);
        }
    };

    const fetchRevenueData = async (code: string) => {
        setRevenueLoading(true);
        setRevenueError(null);
        try {
            const [revenueRes, priceRes] = await Promise.all([
                fetch(`/api/investment/revenue?code=${code}`),
                fetch(`/api/investment/price-monthly?code=${code}`),
            ]);

            if (!revenueRes.ok) throw new Error('無法獲取營收數據');

            const revenue: RevenueData[] = await revenueRes.json();
            const prices: MonthlyPrice[] = priceRes.ok ? await priceRes.json() : [];

            setRevenueData(revenue);
            setMonthlyPriceData(prices);
        } catch (err: any) {
            setRevenueError(err.message);
            setRevenueData([]);
            setMonthlyPriceData([]);
        } finally {
            setRevenueLoading(false);
        }
    };

    const fetchChipsData = async (code: string) => {
        setChipsLoading(true);
        setChipsError(null);
        try {
            const response = await fetch(`/api/investment/chips?code=${code}&weeks=48`);
            if (!response.ok) throw new Error('無法獲取籌碼數據');
            const data: ShareholderData[] = await response.json();
            setChipsData(data);
        } catch (err: any) {
            setChipsError(err.message);
            setChipsData([]);
        } finally {
            setChipsLoading(false);
        }
    };

    const fetchBrokerData = async (code: string) => {
        setBrokerLoading(true);
        setBrokerError(null);
        try {
            const response = await fetch(`/api/investment/broker-transactions?code=${code}`);
            if (!response.ok) throw new Error('無法獲取券商數據');
            const data: BrokerTransactionData[] = await response.json();
            setBrokerData(data);
        } catch (err: any) {
            setBrokerError(err.message);
            setBrokerData([]);
        } finally {
            setBrokerLoading(false);
        }
    };

    // 導航函數
    const handlePrev = () => {
        if (currentIndex > 0 && holdings.length > 0) {
            const prevStock = holdings[currentIndex - 1];
            router.push(`/investment/dashboard/${prevStock.stock_code}`);
        }
    };

    const handleNext = () => {
        if (currentIndex < holdings.length - 1 && holdings.length > 0) {
            const nextStock = holdings[currentIndex + 1];
            router.push(`/investment/dashboard/${nextStock.stock_code}`);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4">
            {/* 頂部導航 */}
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push('/investment')}
                        className="flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        返回
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                            {stockCode} {stockName && `${stockName}`}
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            技術分析 • 基本面 • 籌碼分析
                        </p>
                    </div>
                </div>

                {/* 股票導航按鈕 - 總是顯示 */}
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrev}
                        disabled={currentIndex <= 0 || holdings.length === 0}
                        className="h-9 w-9 p-0"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    
                    <div className="flex flex-col items-center min-w-[80px]">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                            Stock
                        </span>
                        <span className="text-sm font-mono font-semibold text-slate-700 dark:text-slate-300">
                            {holdings.length > 0 && currentIndex >= 0 
                                ? `${currentIndex + 1} / ${holdings.length}`
                                : '- / -'
                            }
                        </span>
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNext}
                        disabled={currentIndex >= holdings.length - 1 || holdings.length === 0}
                        className="h-9 w-9 p-0"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            {/* Grid 佈局 - 2x3 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-10">
                {/* 左上：K線圖 */}
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                    <h2 className="text-sm font-bold mb-2 text-slate-800 dark:text-slate-200">
                        📈 技術分析 - K線圖
                    </h2>
                    <div className="relative h-[calc(100%-2rem)]">
                        {priceLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm z-10">
                                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                            </div>
                        )}
                        {priceError ? (
                            <div className="flex items-center justify-center h-full text-red-500 text-sm">
                                {priceError}
                            </div>
                        ) : (
                            <StockChart
                                data={priceData}
                                isDarkMode={typeof document !== 'undefined' && document.documentElement.classList.contains('dark')}
                            />
                        )}
                    </div>
                </div>

                {/* 右上：營收 vs 股價 */}
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                    <h2 className="text-sm font-bold mb-2 text-slate-800 dark:text-slate-200">
                        💰 基本面分析 - 營收 vs 股價
                    </h2>
                    <div className="relative h-[calc(100%-2rem)]">
                        {revenueLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm z-10">
                                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                            </div>
                        )}
                        {revenueError ? (
                            <div className="flex items-center justify-center h-full text-red-500 text-sm">
                                {revenueError}
                            </div>
                        ) : revenueData.length > 0 ? (
                            <RevenueChart revenueData={revenueData} priceData={monthlyPriceData} />
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                                無營收數據
                            </div>
                        )}
                    </div>
                </div>

                {/* 左下：股權分散疊圖 */}
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                    <h2 className="text-sm font-bold mb-2 text-slate-800 dark:text-slate-200">
                        🎯 籌碼分析 - 股權分散
                    </h2>
                    <div className="relative h-[calc(100%-2rem)]">
                        {chipsLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm z-10">
                                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                            </div>
                        )}
                        {chipsError ? (
                            <div className="flex items-center justify-center h-full text-red-500 text-sm">
                                {chipsError}
                            </div>
                        ) : chipsData.length > 0 ? (
                            <ChipsChart data={chipsData} />
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                                無籌碼數據
                            </div>
                        )}
                    </div>
                </div>

                {/* 右下：大戶與散戶流向（雙圖） */}
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-2">
                    {/* 大戶流向 */}
                    <div className="flex-1 overflow-hidden">
                        <h2 className="text-sm font-bold mb-2 text-slate-800 dark:text-slate-200">
                            🔥 大戶籌碼流向
                        </h2>
                        <div className="h-[calc(100%-2rem)]">
                            {chipsData.length > 0 ? (
                                <ShareholderFlowChart data={chipsData} type="large" />
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                                    無大戶流向數據
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 分隔線 */}
                    <div className="border-t border-slate-200 dark:border-slate-700"></div>

                    {/* 散戶流向 */}
                    <div className="flex-1 overflow-hidden">
                        <h2 className="text-sm font-bold mb-2 text-slate-800 dark:text-slate-200">
                            💎 散戶籌碼流向
                        </h2>
                        <div className="h-[calc(100%-2rem)]">
                            {chipsData.length > 0 ? (
                                <ShareholderFlowChart data={chipsData} type="retail" />
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                                    無散戶流向數據
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            {/* 5. 券商分點分析 (Top 15) - Full Width */}
            <div className="col-span-1 lg:col-span-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                <h2 className="text-sm font-bold mb-2 text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-amber-500" />
                    主力券商籌碼分析 (Top 15)
                </h2>
                <div className="relative h-[400px]">
                    {brokerLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm z-10">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        </div>
                    )}
                    {brokerError ? (
                        <div className="flex items-center justify-center h-full text-red-500 text-sm">
                            {brokerError} <span className="ml-2 text-xs text-slate-400"> (可能暫無資料)</span>
                        </div>
                    ) : brokerData.length > 0 ? (
                        <BrokerChart data={brokerData} />
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                            尚無券商分析資料
                        </div>
                    )}
                </div>
            </div>
        </div>
        </div>
    );
}
