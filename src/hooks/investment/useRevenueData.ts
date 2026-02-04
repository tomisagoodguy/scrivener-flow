/**
 * useRevenueData Hook
 * 
 * 從 PriceChartModal 抽離的營收資料獲取邏輯
 */

import { useState, useEffect, useCallback } from 'react';

export interface RevenueData {
    data_date: string;
    revenue: number;
    revenue_yoy: number | null;
    revenue_mom: number | null;
}

export interface MonthlyPrice {
    month: string;
    avg_price: number;
}

interface UseRevenueDataResult {
    revenueData: RevenueData[];
    monthlyPriceData: MonthlyPrice[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useRevenueData(stockCode: string | null, isActive = true): UseRevenueDataResult {
    const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
    const [monthlyPriceData, setMonthlyPriceData] = useState<MonthlyPrice[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!stockCode) return;

        setLoading(true);
        setError(null);

        try {
            // 並行取得營收與月均價
            const [revenueRes, priceRes] = await Promise.all([
                fetch(`/api/investment/revenue?code=${stockCode}`),
                fetch(`/api/investment/price-monthly?code=${stockCode}`),
            ]);

            if (!revenueRes.ok) {
                throw new Error('無法獲取營收數據');
            }

            const revenue: RevenueData[] = await revenueRes.json();
            const prices: MonthlyPrice[] = priceRes.ok ? await priceRes.json() : [];

            setRevenueData(revenue);
            setMonthlyPriceData(prices);
        } catch (err: any) {
            setError(err.message);
            setRevenueData([]);
            setMonthlyPriceData([]);
        } finally {
            setLoading(false);
        }
    }, [stockCode]);

    useEffect(() => {
        if (isActive && stockCode) {
            fetchData();
        }
    }, [isActive, stockCode, fetchData]);

    return { revenueData, monthlyPriceData, loading, error, refetch: fetchData };
}
