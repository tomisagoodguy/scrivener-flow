/**
 * useBrokerData Hook
 * 
 * 從 PriceChartModal 抽離的券商籌碼資料獲取邏輯
 */

import { useState, useEffect, useCallback } from 'react';

export interface BrokerData {
    data_date: string;
    net_volume: number;
    force_metric: number | null;
}

interface UseBrokerDataResult {
    data: BrokerData[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useBrokerData(stockCode: string | null, isActive = true): UseBrokerDataResult {
    const [data, setData] = useState<BrokerData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!stockCode) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/investment/broker-transactions?code=${stockCode}`);
            
            if (!response.ok) {
                const resText = await response.text();
                try {
                    const errObj = JSON.parse(resText);
                    if (errObj.error) throw new Error(errObj.error);
                } catch (e) {
                    // ignore
                }
                throw new Error('無法獲取券商數據');
            }

            const result: BrokerData[] = await response.json();
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
