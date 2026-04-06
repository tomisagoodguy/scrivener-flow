import React, { useState } from "react";
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
import { useTheme } from "@/components/providers/ThemeProvider";
import { 
    usePriceData, 
    useRevenueData, 
    useChipsData, 
    useBrokerData 
} from "@/hooks/investment";

interface PriceChartModalProps {
    isOpen: boolean;
    onClose: () => void;
    holdings: Holding[];
    initialIndex: number;
}

/**
 * PriceChartModal (重構版)
 * 
 * 使用 Custom Hooks 管理資料獲取邏輯
 * 垂直滾動佈局，一次顯示所有分析圖表
 */
export function PriceChartModal({ isOpen, onClose, holdings, initialIndex }: PriceChartModalProps) {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';

    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [prevInitialIndex, setPrevInitialIndex] = useState(initialIndex);
    const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

    // Derived state logic: Reset currentIndex when isOpen becomes true 
    // or if initialIndex changes while the modal is open.
    // This avoids the "Cannot update a component while rendering another component" warning 
    // and synchronous useEffect setState performance warnings.
    if (initialIndex !== prevInitialIndex || (isOpen && !prevIsOpen)) {
        setPrevInitialIndex(initialIndex);
        setPrevIsOpen(isOpen);
        setCurrentIndex(initialIndex);
    }

    const currentStock = holdings[currentIndex];
    const stockCode = currentStock?.stock_code || null;

    // 使用 Custom Hooks 獲取資料
    const { data: priceData, loading: priceLoading, error: priceError } = usePriceData(stockCode, isOpen);
    const { revenueData, monthlyPriceData, loading: revenueLoading, error: revenueError } = useRevenueData(stockCode, isOpen);
    const { data: chipsData, loading: chipsLoading, error: chipsError } = useChipsData(stockCode, 48, isOpen);
    const { data: brokerData, loading: brokerLoading, error: brokerError } = useBrokerData(stockCode, isOpen);

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
                        <ChartSection 
                            title="📈 技術分析 - K線圖"
                            description="指標：5/20/60MA 均線 & 成交量 (最近 250 交易日)"
                            loading={priceLoading}
                            error={priceError}
                            hasData={priceData.length > 0}
                            emptyMessage="查無歷史數據"
                        >
                            <StockChart data={priceData} isDarkMode={isDarkMode} />
                        </ChartSection>

                        {/* 2. 營收 vs 股價 */}
                        <ChartSection 
                            title="💰 基本面分析 - 營收 vs 股價"
                            description="近 24 個月營收 & MA(3)/MA(12) 均線 • YoY 動態顏色標示"
                            loading={revenueLoading}
                            error={revenueError}
                            hasData={revenueData.length > 0}
                            emptyMessage="無營收數據"
                        >
                            <RevenueChart revenueData={revenueData} priceData={monthlyPriceData} />
                        </ChartSection>

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

                        {/* 4. 主力券商籌碼分析 */}
                        <ChartSection 
                            title="🏦 主力券商籌碼分析 (Top 15)"
                            description="淨買賣超 (Bar) & 主力動能指標 (Line) • 追蹤前 15 大分點動作"
                            loading={brokerLoading}
                            error={brokerError}
                            hasData={brokerData.length > 0}
                            emptyMessage="無券商數據"
                        >
                            <BrokerChart data={brokerData} />
                        </ChartSection>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

/**
 * ChartSection Component
 * 圖表區塊的共用容器
 */
interface ChartSectionProps {
    title: string;
    description: string;
    loading: boolean;
    error: string | null;
    hasData: boolean;
    emptyMessage: string;
    children: React.ReactNode;
}

function ChartSection({ 
    title, 
    description, 
    loading, 
    error, 
    hasData, 
    emptyMessage, 
    children 
}: ChartSectionProps) {
    return (
        <section className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2 text-slate-800 dark:text-slate-200">
                {title}
            </h2>
            <div className="relative h-[450px]">
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/50 dark:bg-slate-950/50 backdrop-blur-[1px]">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                )}
                
                {error ? (
                    <div className="absolute inset-0 flex items-center justify-center z-10 text-red-500 font-medium">
                        {error}
                    </div>
                ) : hasData ? (
                    children
                ) : !loading ? (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                        {emptyMessage}
                    </div>
                ) : null}
            </div>
            <p className="mt-2 text-xs text-slate-400 uppercase tracking-wider">
                {description}
            </p>
        </section>
    );
}
