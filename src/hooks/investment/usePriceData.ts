/**
 * usePriceData Hook
 * 
 * 從 PriceChartModal 抽離的價格資料獲取邏輯
 */

import { useState, useEffect, useCallback } from 'react';
import { PriceData } from '@/lib/investment/indicators';

interface UsePriceDataResult {
    data: PriceData[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function usePriceData(stockCode: string | null, isActive = true): UsePriceDataResult {
    const [data, setData] = useState<PriceData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!stockCode) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/investment/prices?code=${stockCode}`);
            if (!response.ok) throw new Error('無法獲取價格數據');
            
            const result: PriceData[] = await response.json();
            if (result.length === 0) throw new Error('查無歷史數據');
            
            setData(result);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err));
            setData([]);
        } finally {
            setLoading(false);
        }
    }, [stockCode]);

    useEffect(() => {
        if (isActive && stockCode) {
            fetchData();
        }
    }, [isActive, stockCode, fetchData]);

    return { data, loading, error, refetch: fetchData };
}
