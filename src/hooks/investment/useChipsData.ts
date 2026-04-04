/**
 * useChipsData Hook
 * 
 * 從 PriceChartModal 抽離的籌碼資料獲取邏輯
 */

import { useState, useEffect, useCallback } from 'react';

export interface ShareholderData {
    data_date: string;
    shareholder_tier: number;
    holder_count: number | null;
    shares_held: number | null;
    custody_ratio: number | null;
}

interface UseChipsDataResult {
    data: ShareholderData[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useChipsData(
    stockCode: string | null, 
    weeks = 48,
    isActive = true
): UseChipsDataResult {
    const [data, setData] = useState<ShareholderData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!stockCode) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/investment/chips?code=${stockCode}&weeks=${weeks}`);
            
            if (!response.ok) {
                throw new Error('無法獲取籌碼數據');
            }

            const result: ShareholderData[] = await response.json();
            setData(result);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err));
            setData([]);
        } finally {
            setLoading(false);
        }
    }, [stockCode, weeks]);

    useEffect(() => {
        if (isActive && stockCode) {
            fetchData();
        }
    }, [isActive, stockCode, fetchData]);

    return { data, loading, error, refetch: fetchData };
}
