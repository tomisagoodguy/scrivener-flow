import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PriceData } from '@/lib/investment/indicators';
import type { Holding } from '@/types/investment';
import { filterAndSortHoldings, SortField, SortOrder } from '@/lib/investment/holdingFilters';

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

export interface ShareholderData {
    data_date: string;
    shareholder_tier: number;
    holder_count: number | null;
    shares_held: number | null;
    custody_ratio: number | null;
}

export interface BrokerTransactionData {
    data_date: string;
    net_volume: number;
    force_metric: number | null;
    buy_amount?: number;
    sell_amount?: number;
}

export interface NavStock {
    code: string;
    name: string;
}

export function useStockDashboard(stockCode: string) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [stockName, setStockName] = useState('');
    const [prevStock, setPrevStock] = useState<NavStock | null>(null);
    const [nextStock, setNextStock] = useState<NavStock | null>(null);

    const [priceData, setPriceData] = useState<PriceData[]>([]);
    const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
    const [monthlyPriceData, setMonthlyPriceData] = useState<MonthlyPrice[]>([]);
    const [chipsData, setChipsData] = useState<ShareholderData[]>([]);
    const [brokerData, setBrokerData] = useState<BrokerTransactionData[]>([]);

    const [loading, setLoading] = useState(true);
    const [priceLoading, setPriceLoading] = useState(false);
    const [revenueLoading, setRevenueLoading] = useState(false);
    const [chipsLoading, setChipsLoading] = useState(false);
    const [brokerLoading, setBrokerLoading] = useState(false);

    const [priceError, setPriceError] = useState<string | null>(null);
    const [revenueError, setRevenueError] = useState<string | null>(null);
    const [chipsError, setChipsError] = useState<string | null>(null);
    const [brokerError, setBrokerError] = useState<string | null>(null);

    useEffect(() => {
        const fetchHoldings = async () => {
            try {
                const response = await fetch('/api/investment/holdings');
                if (!response.ok) return;
                let data: Holding[] = await response.json();

                if (searchParams.toString()) {
                    const filters = searchParams.get('filters')?.split(',') || [];
                    const search = searchParams.get('search') || '';
                    const sort = (searchParams.get('sort') as SortField) || 'weight';
                    const order = (searchParams.get('order') as SortOrder) || 'desc';
                    data = filterAndSortHoldings(data, filters, search, sort, order);
                }

                const index = data.findIndex((h: Holding) => h.stock_code === stockCode);
                const target = data[index];
                if (target) {
                    setStockName(target.stock_name);
                    setPrevStock(index > 0 ? { code: data[index - 1].stock_code, name: data[index - 1].stock_name } : null);
                    setNextStock(index < data.length - 1 ? { code: data[index + 1].stock_code, name: data[index + 1].stock_name } : null);
                }
            } catch (err) {
                console.error('Failed to fetch holdings:', err);
            }
        };

        fetchHoldings();
    }, [stockCode, searchParams]);

    useEffect(() => {
        if (stockCode) fetchAllData(stockCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stockCode]);

    const handleNavigate = (targetCode: string) => {
        const query = searchParams.toString();
        router.push(`/investment/dashboard/${targetCode}${query ? `?${query}` : ''}`);
    };

    const fetchAllData = async (code: string) => {
        setLoading(true);
        setPriceLoading(true); setRevenueLoading(true); setChipsLoading(true); setBrokerLoading(true);
        setPriceError(null); setRevenueError(null); setChipsError(null); setBrokerError(null);

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
        try {
            const res = await fetch(`/api/investment/prices?code=${code}`);
            if (!res.ok) throw new Error('無法獲取價格數據');
            const data: PriceData[] = await res.json();
            if (data.length === 0) throw new Error('查無歷史數據');
            setPriceData(data);
        } catch (err: unknown) {
            setPriceError(err instanceof Error ? err.message : '未知錯誤');
            setPriceData([]);
        } finally {
            setPriceLoading(false);
        }
    };

    const fetchRevenueData = async (code: string) => {
        setRevenueLoading(true);
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
        } catch (err: unknown) {
            setRevenueError(err instanceof Error ? err.message : '未知錯誤');
            setRevenueData([]); setMonthlyPriceData([]);
        } finally {
            setRevenueLoading(false);
        }
    };

    const fetchChipsData = async (code: string) => {
        setChipsLoading(true);
        try {
            const res = await fetch(`/api/investment/chips?code=${code}&weeks=48`);
            if (!res.ok) throw new Error('無法獲取籌碼數據');
            setChipsData(await res.json());
        } catch (err: unknown) {
            setChipsError(err instanceof Error ? err.message : '未知錯誤');
            setChipsData([]);
        } finally {
            setChipsLoading(false);
        }
    };

    const fetchBrokerData = async (code: string) => {
        setBrokerLoading(true);
        try {
            const res = await fetch(`/api/investment/broker-transactions?code=${code}`);
            if (!res.ok) throw new Error('無法獲取券商數據');
            setBrokerData(await res.json());
        } catch (err: unknown) {
            setBrokerError(err instanceof Error ? err.message : '未知錯誤');
            setBrokerData([]);
        } finally {
            setBrokerLoading(false);
        }
    };

    return {
        stockName, prevStock, nextStock, handleNavigate,
        priceData, revenueData, monthlyPriceData, chipsData, brokerData,
        loading, priceLoading, revenueLoading, chipsLoading, brokerLoading,
        priceError, revenueError, chipsError, brokerError,
    };
}
