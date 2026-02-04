
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Holding } from "@/types/investment";
import { StockChart } from "./StockChart";
import { RevenueChart } from "./RevenueChart";
import { ChipsChart } from "./ChipsChart";
import { ShareholderFlowChart } from "./ShareholderFlowChart";
import { InvestmentTrustChart } from './InvestmentTrustChart';
import { BrokerChart } from "./BrokerChart";
import { PriceData } from "@/lib/investment/indicators";
import { useTheme } from "@/components/providers/ThemeProvider";

interface PriceChartModalProps {
    isOpen: boolean;
    onClose: () => void;
    holdings: Holding[];
    initialIndex: number;
}

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

interface BrokerData {
    data_date: string;
    net_volume: number;
    force_metric: number | null;
}

/**
 * PriceChartModal (全頁版)
 * 垂直滾動佈局，一次顯示所有分析圖表
 */
export function PriceChartModal({ isOpen, onClose, holdings, initialIndex }: PriceChartModalProps) {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';

    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    // K線圖數據
    const [priceData, setPriceData] = useState<PriceData[]>([]);
    const [priceLoading, setPriceLoading] = useState(false);
    const [priceError, setPriceError] = useState<string | null>(null);
    
    // 營收數據
    const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
    const [monthlyPriceData, setMonthlyPriceData] = useState<MonthlyPrice[]>([]);
    const [revenueLoading, setRevenueLoading] = useState(false);
    const [revenueError, setRevenueError] = useState<string | null>(null);

    // 籌碼數據
    const [chipsData, setChipsData] = useState<ShareholderData[]>([]);
    const [chipsLoading, setChipsLoading] = useState(false);
    const [chipsError, setChipsError] = useState<string | null>(null);

    // 券商籌碼數據 (Top 15)
    const [brokerData, setBrokerData] = useState<BrokerData[]>([]);
    const [brokerLoading, setBrokerLoading] = useState(false);
    const [brokerError, setBrokerError] = useState<string | null>(null);

    const currentStock = holdings[currentIndex];

    // Reset index when modal opens
    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex);
        }
    }, [initialIndex, isOpen]);

    // Fetch all data when stock changes
    useEffect(() => {
        if (isOpen && currentStock) {
            fetchAllData(currentStock.stock_code);
        }
    }, [isOpen, currentIndex, currentStock?.stock_code]);

    const fetchAllData = async (code: string) => {
        // 並行取得所有數據
        await Promise.all([
            fetchPriceData(code),
            fetchRevenueData(code),
            fetchChipsData(code),
            fetchBrokerData(code),
        ]);
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
            // 並行取得營收與月均價
            const [revenueRes, priceRes] = await Promise.all([
                fetch(`/api/investment/revenue?code=${code}`),
                fetch(`/api/investment/price-monthly?code=${code}`),
            ]);

            if (!revenueRes.ok) {
                throw new Error('無法獲取營收數據');
            }

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
            
            if (!response.ok) {
                throw new Error('無法獲取籌碼數據');
            }

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
            
            if (!response.ok) {
                // 如果是 404 或其他錯誤，可能代表無數據
                const resText = await response.text();
                // 嘗試解析 JSON 錯誤訊息
                try {
                    const errObj = JSON.parse(resText);
                    if (errObj.error) throw new Error(errObj.error);
                } catch (e) {
                    // ignore
                }
                throw new Error('無法獲取券商數據');
            }

            const data: BrokerData[] = await response.json();
            setBrokerData(data);
        } catch (err: any) {
            setBrokerError(err.message);
            setBrokerData([]);
        } finally {
            setBrokerLoading(false);
        }
    };

    const handleNext = () => setCurrentIndex((prev) => (prev + 1) % holdings.length);
    const handlePrev = () => setCurrentIndex((prev) => (prev - 1 + holdings.length) % holdings.length);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl h-[750px] flex flex-col">
                <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex flex-col">
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                            {currentStock?.stock_code} {currentStock?.stock_name}
                        </DialogTitle>
                        <DialogDescription>
                            完整財務與技術分析儀表板
                        </DialogDescription>
                    </div>
                    
                    <div className="flex items-center gap-4 mr-8">
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" onClick={handlePrev} className="h-8 w-8">
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-xs font-mono text-slate-500 w-12 text-center">
                                {currentIndex + 1} / {holdings.length}
                            </span>
                            <Button variant="outline" size="icon" onClick={handleNext} className="h-8 w-8">
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                {/* 垂直滾動佈局 - 顯示所有圖表 */}
                <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="p-4 space-y-6">
                        {/* 1. K線圖 */}
                        <section className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
                            <h2 className="text-lg font-bold mb-3 flex items-center gap-2 text-slate-800 dark:text-slate-200">
                                📈 技術分析 - K線圖
                            </h2>
                            <div className="relative h-[450px]">
                                {priceLoading && (
                                    <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/50 dark:bg-slate-950/50 backdrop-blur-[1px]">
                                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                    </div>
                                )}
                                
                                {priceError ? (
                                    <div className="absolute inset-0 flex items-center justify-center z-10 text-red-500 font-medium">
                                        {priceError}
                                    </div>
                                ) : (
                                    <StockChart 
                                        data={priceData} 
                                        isDarkMode={isDarkMode} 
                                    />
                                )}
                            </div>
                            <p className="mt-2 text-xs text-slate-400 uppercase tracking-wider">
                                指標：5/20/60MA 均線 & 成交量 (最近 250 交易日)
                            </p>
                        </section>

                        {/* 2. 營收 vs 股價 */}
                        <section className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
                            <h2 className="text-lg font-bold mb-3 flex items-center gap-2 text-slate-800 dark:text-slate-200">
                                💰 基本面分析 - 營收 vs 股價
                            </h2>
                            <div className="relative h-[450px]">
                                {revenueLoading && (
                                    <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/50 dark:bg-slate-950/50 backdrop-blur-[1px]">
                                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                    </div>
                                )}
                                
                                {revenueError ? (
                                    <div className="absolute inset-0 flex items-center justify-center z-10 text-red-500 font-medium">
                                        {revenueError}
                                    </div>
                                ) : revenueData.length > 0 ? (
                                    <RevenueChart revenueData={revenueData} priceData={monthlyPriceData} />
                                ) : !revenueLoading ? (
                                    <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                                        無營收數據
                                    </div>
                                ) : null}
                            </div>
                            <p className="mt-2 text-xs text-slate-400 uppercase tracking-wider">
                                近 24 個月營收 & MA(3)/MA(12) 均線 • YoY 動態顏色標示
                            </p>
                        </section>

                        {/* 3. 籌碼分析 */}
                        <section className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-200">
                                🎯 籌碼分析 - 股權結構與流向
                            </h2>
                            
                            {chipsLoading && (
                                <div className="flex items-center justify-center py-20">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                </div>
                            )}
                            
                            {chipsError ? (
                                <div className="flex items-center justify-center py-20 text-red-500 font-medium">
                                    {chipsError}
                                </div>
                            ) : chipsData.length > 0 ? (
                                <div className="space-y-6">
                                    {/* 3-1. 股權分散疊圖 */}
                                    <div className="border-l-4 border-blue-500 pl-4">
                                        <h3 className="text-sm font-semibold mb-3 text-slate-700 dark:text-slate-300">
                                            股權分散疊圖
                                        </h3>
                                        <ChipsChart data={chipsData} />
                                    </div>

                                    {/* 3-2. 投信買賣超分析 */}
                                    <div className="border-l-4 border-orange-500 pl-4">
                                        <h3 className="text-sm font-semibold mb-3 text-slate-700 dark:text-slate-300">
                                            投信買賣超 & 均線 (MA5/MA20)
                                        </h3>
                                        {/* Use priceData which contains the daily 'it_buy' info */}
                                        <InvestmentTrustChart 
                                            data={priceData} 
                                            isDarkMode={isDarkMode}
                                        />
                                    </div>

                                    <div className="border-t border-slate-200 dark:border-slate-700"></div>

                                    {/* 3-2. 大戶籌碼流向 */}
                                    <div className="border-l-4 border-orange-500 pl-4">
                                        <ShareholderFlowChart data={chipsData} type="large" />
                                    </div>

                                    <div className="border-t border-slate-200 dark:border-slate-700"></div>

                                    {/* 3-3. 散戶籌碼流向 */}
                                    <div className="border-l-4 border-purple-500 pl-4">
                                        <ShareholderFlowChart data={chipsData} type="retail" />
                                    </div>
                                </div>
                            ) : !chipsLoading ? (
                                <div className="flex items-center justify-center py-20 text-slate-400">
                                    無籌碼數據
                                </div>
                            ) : null}

                            <p className="mt-4 text-xs text-slate-400 uppercase tracking-wider">
                                三合一籌碼分析 • 股權分散 (48週) + 大戶流向 (10週) + 散戶流向 (10週)
                            </p>
                        </section>

                        {/* 4. 主力券商籌碼分析 (Top 15) */}
                        <section className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-200">
                                🏦 主力券商籌碼分析 (Top 15)
                            </h2>
                            
                            <div className="relative h-[450px]">
                                {brokerLoading && (
                                    <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/50 dark:bg-slate-950/50 backdrop-blur-[1px]">
                                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                    </div>
                                )}
                                
                                {brokerError ? (
                                    <div className="absolute inset-0 flex items-center justify-center z-10 text-red-500 font-medium">
                                        {brokerError}
                                    </div>
                                ) : brokerData.length > 0 ? (
                                    <BrokerChart data={brokerData} />
                                ) : !brokerLoading ? (
                                    <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                                        無券商數據
                                    </div>
                                ) : null}
                            </div>
                            <p className="mt-2 text-xs text-slate-400 uppercase tracking-wider">
                                淨買賣超 (Bar) & 主力動能指標 (Line) • 追蹤前 15 大分點動作
                            </p>
                        </section>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
