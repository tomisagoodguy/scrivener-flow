'use client';

import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Holding } from "./HoldingsTable";
import { StockChart } from "./StockChart";
import { PriceData } from "@/lib/investment/indicators";

interface PriceChartModalProps {
    isOpen: boolean;
    onClose: () => void;
    holdings: Holding[];
    initialIndex: number;
}

/**
 * PriceChartModal (Container Component)
 * Manages the modal state, data fetching, and navigation.
 * Delegates actual rendering to StockChart and logic to IndicatorService.
 */
export function PriceChartModal({ isOpen, onClose, holdings, initialIndex }: PriceChartModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [priceData, setPriceData] = useState<PriceData[]>([]);
    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    const currentStock = holdings[currentIndex];

    // Reset index when modal opens with a new initial selection
    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex);
        }
    }, [initialIndex, isOpen]);

    // Fetch data when stock changes
    useEffect(() => {
        if (isOpen && currentStock) {
            fetchStockData(currentStock.stock_code);
        }
    }, [isOpen, currentIndex, currentStock?.stock_code]);

    const fetchStockData = async (code: string) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/investment/prices?code=${code}`);
            if (!response.ok) throw new Error('無法獲取價格數據');
            const data: PriceData[] = await response.json();
            
            if (data.length === 0) throw new Error('查無歷史數據');
            setPriceData(data);
        } catch (err: any) {
            setError(err.message);
            setPriceData([]);
        } finally {
            setLoading(false);
        }
    };

    const handleNext = () => setCurrentIndex((prev) => (prev + 1) % holdings.length);
    const handlePrev = () => setCurrentIndex((prev) => (prev - 1 + holdings.length) % holdings.length);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl h-[700px] flex flex-col">
                <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex flex-col">
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                            {currentStock?.stock_code} {currentStock?.stock_name}
                            <span className="text-sm font-normal text-slate-500">動能 K 線圖</span>
                        </DialogTitle>
                        <DialogDescription>
                            指標：5/20/60MA 均線 & 成交量 (最近 250 交易日)
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

                <div className="flex-1 min-h-0 relative bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/50 dark:bg-slate-950/50 backdrop-blur-[1px]">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        </div>
                    )}
                    
                    {error ? (
                        <div className="absolute inset-0 flex items-center justify-center z-10 text-red-500 font-medium">
                            {error}
                        </div>
                    ) : (
                        <StockChart data={priceData} isDarkMode={typeof document !== 'undefined' && document.documentElement.classList.contains('dark')} />
                    )}
                </div>
                
                <div className="mt-4 flex justify-between items-center text-[10px] text-slate-400 uppercase tracking-wider">
                    <div className="flex gap-4">
                        <span>• 系統每日自動同步</span>
                        <span>• 資料來源：Finlab 資料庫</span>
                    </div>
                    <span>滾輪縮放 • 拖曳檢視</span>
                </div>
            </DialogContent>
        </Dialog>
    );
}
