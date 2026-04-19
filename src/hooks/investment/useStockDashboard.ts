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

export interface StockQuantMetrics {
    momentum_60d: number | null;
    momentum_pass: boolean;
    it_buy_5d: number | null;
    it_buy_5d_pass: boolean;
    rev_ma3_new_high: boolean;
    filter_score: number | null;
    revenue_yoy: number | null;
    is_20d_high: boolean;
    is_200d_high: boolean;
}

export function useStockDashboard(stockCode: string) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [stockName, setStockName] = useState('');
    const [prevStock, setPrevStock] = useState<NavStock | null>(null);
    const [nextStock, setNextStock] = useState<NavStock | null>(null);
    const [currentIndex, setCurrentIndex] = useState<number>(-1);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [chipRank, setChipRank] = useState<number | null>(null);
    const [retailRank, setRetailRank] = useState<number | null>(null);
    const [quantMetrics, setQuantMetrics] = useState<StockQuantMetrics>({ momentum_60d: null, momentum_pass: false, it_buy_5d: null, it_buy_5d_pass: false, rev_ma3_new_high: false, filter_score: null, revenue_yoy: null, is_20d_high: false, is_200d_high: false });

    const [priceData, setPriceData] = useState<PriceData[]>([]);
    const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
    const [monthlyPriceData, setMonthlyPriceData] = useState<MonthlyPrice[]>([]);
    const [chipsData, setChipsData] = useState<ShareholderData[]>([]);
    const [brokerData, setBrokerData] = useState<BrokerTransactionData[]>([]);

    const [etfWeightHistory, setEtfWeightHistory] = useState<Record<string, { date: string; weight: number; rank: number }[]>>({});
    const [etfWeightHistoryLoading, setEtfWeightHistoryLoading] = useState(false);

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
                const source = searchParams.get('source');
                const isFromEquity = source === 'equity' || source === 'equity-retail';
                const isRetailSource = source === 'equity-retail';

                if (isFromEquity) {
                    const response = await fetch('/api/investment/equity-chips');
                    if (!response.ok) return;
                    const chips: { stock_code: string; stock_name: string | null; big_holder_pct_change: number | null; shareholders_change_rate: number | null }[] = await response.json();
                    // chips is already sorted by chip score (big_holder DESC)

                    // chip rank
                    const chipIdx = chips.findIndex((s) => s.stock_code === stockCode);
                    setChipRank(chipIdx >= 0 ? chipIdx + 1 : null);

                    // retail rank (shareholders_change_rate ASC, nulls last)
                    const retailSorted = [...chips].sort((a, b) => {
                        if (a.shareholders_change_rate === null) return 1;
                        if (b.shareholders_change_rate === null) return -1;
                        return a.shareholders_change_rate - b.shareholders_change_rate;
                    });
                    const retailIdx = retailSorted.findIndex((s) => s.stock_code === stockCode);
                    setRetailRank(retailIdx >= 0 ? retailIdx + 1 : null);

                    const navList = isRetailSource ? retailSorted : chips;
                    setTotalCount(navList.length);
                    const index = navList.findIndex((s) => s.stock_code === stockCode);
                    if (index >= 0) {
                        setStockName(navList[index].stock_name ?? stockCode);
                        setPrevStock(index > 0 ? { code: navList[index - 1].stock_code, name: navList[index - 1].stock_name ?? navList[index - 1].stock_code } : null);
                        setNextStock(index < navList.length - 1 ? { code: navList[index + 1].stock_code, name: navList[index + 1].stock_name ?? navList[index + 1].stock_code } : null);
                        setCurrentIndex(index + 1);
                    } else {
                        setStockName(stockCode);
                    }
                    return;
                }

                const response = await fetch('/api/investment/holdings');
                if (!response.ok) return;
                const allData: Holding[] = await response.json();

                // 全量用來計算 totalCount
                setTotalCount(allData.length);

                // filtered 清單用來決定上下頁導航與 currentIndex
                let navData = allData;
                if (searchParams.toString()) {
                    const filters = searchParams.get('filters')?.split(',') || [];
                    const search = searchParams.get('search') || '';
                    const sort = (searchParams.get('sort') as SortField) || 'weight';
                    const order = (searchParams.get('order') as SortOrder) || 'desc';
                    navData = filterAndSortHoldings(allData, filters, search, sort, order);
                }

                const index = navData.findIndex((h: Holding) => h.stock_code === stockCode);
                const target = navData[index] ?? allData.find((h) => h.stock_code === stockCode);
                if (target) {
                    setStockName(target.stock_name);
                    setPrevStock(index > 0 ? { code: navData[index - 1].stock_code, name: navData[index - 1].stock_name } : null);
                    setNextStock(index < navData.length - 1 ? { code: navData[index + 1].stock_code, name: navData[index + 1].stock_name } : null);
                    setCurrentIndex(index >= 0 ? index + 1 : -1);
                    type ExtHolding = Holding & { momentum_60d?: number | null; momentum_pass?: boolean; it_buy_5d?: number | null; it_buy_5d_pass?: boolean; rev_ma3_new_high?: boolean; filter_score?: number | null };
                    const ext = target as ExtHolding;
                    setQuantMetrics({
                        momentum_60d: ext.momentum_60d ?? null,
                        momentum_pass: ext.momentum_pass ?? false,
                        it_buy_5d: ext.it_buy_5d ?? null,
                        it_buy_5d_pass: ext.it_buy_5d_pass ?? false,
                        rev_ma3_new_high: ext.rev_ma3_new_high ?? false,
                        filter_score: ext.filter_score ?? null,
                        revenue_yoy: target.revenue_yoy ?? null,
                    });
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
        router.push(`/investment/stock/${targetCode}${query ? `?${query}` : ''}`);
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
            fetchEtfWeightHistory(code),
        ]);
        setLoading(false);
    };

    const fetchEtfWeightHistory = async (code: string) => {
        setEtfWeightHistoryLoading(true);
        try {
            const res = await fetch(`/api/investment/etf-weight-history?code=${code}`);
            if (!res.ok) return;
            const data = await res.json();
            setEtfWeightHistory(data);
        } catch (err: unknown) {
            console.error('Failed to fetch ETF weight history:', err);
        } finally {
            setEtfWeightHistoryLoading(false);
        }
    };

    const fetchPriceData = async (code: string) => {
        setPriceLoading(true);
        try {
            const res = await fetch(`/api/investment/prices?code=${code}`);
            if (!res.ok) throw new Error('無法獲取價格數據');
            const data: PriceData[] = await res.json();
            if (data.length === 0) throw new Error('查無歷史數據');
            setPriceData(data);

            // 計算 20/200 日創新高（data 按日期升序，最新在尾端）
            const latest = data[data.length - 1]?.close ?? 0;
            const prices20 = data.slice(-20).map(d => d.close);
            const prices200 = data.slice(-200).map(d => d.close);
            const is_20d_high = prices20.length >= 20 && latest >= Math.max(...prices20);
            const is_200d_high = prices200.length >= 60 && latest >= Math.max(...prices200);
            setQuantMetrics(prev => ({ ...prev, is_20d_high, is_200d_high }));
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

    // 目前仍持有這支股票的 ETF（有歷史資料即算）
    const holdingEtfs = Object.entries(etfWeightHistory)
        .filter(([, entries]) => entries.length > 0)
        .map(([code]) => code);

    return {
        stockName, prevStock, nextStock, currentIndex, totalCount, chipRank, retailRank, handleNavigate, quantMetrics,
        priceData, revenueData, monthlyPriceData, chipsData, brokerData,
        etfWeightHistory, etfWeightHistoryLoading, holdingEtfs,
        loading, priceLoading, revenueLoading, chipsLoading, brokerLoading,
        priceError, revenueError, chipsError, brokerError,
    };
}
