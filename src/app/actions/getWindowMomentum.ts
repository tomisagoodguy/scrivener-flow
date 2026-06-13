'use server';

import { unstable_cache } from 'next/cache';
import { getPublicClient } from '@/lib/supabase/service';
import {
    aggregateWindowMomentum,
    computeAbsorptionRatio,
    computeAbsorptionTrend,
    type AbsorptionTrend,
    type EtfAccumulationDetail,
    type WindowDiffEvent,
} from '@/lib/investment/windowMomentumUtils';

export interface MomentumCandle {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface WindowMomentumStock {
    stockCode: string;
    stockName: string;
    etfCount: number;
    /** 窗口加碼總股數（股） */
    totalAccumulatedShares: number;
    /** 合計增幅（pp） */
    totalWeightChange: number;
    /** 窗口內最大單筆增幅（pp） */
    maxSingleWeightChange: number;
    /** 吸量比 = 加碼股數 ÷ 窗口市場成交股數；無 OHLCV 時為 null */
    absorptionRatio: number | null;
    absorptionTrend: AbsorptionTrend;
    /** 窗口漲跌幅（首日收盤 → 末日收盤，%）；K 線不足 2 根時為 null */
    priceChangePercent: number | null;
    etfDetails: EtfAccumulationDetail[];
    candles: MomentumCandle[];
}

export interface WindowMomentumResult {
    stocks: WindowMomentumStock[];
    /** 窗口起日（升冪第一天） */
    windowStart: string;
    /** 窗口迄日（最新交易日） */
    windowEnd: string;
}

type Supabase = ReturnType<typeof getPublicClient>;

/** 取最近 N 個交易日（market_breadth_daily 每交易日恰一列，date 為 PK） */
async function fetchWindowTradingDates(supabase: Supabase, windowDays: number): Promise<string[]> {
    const { data, error } = await supabase
        .from('market_breadth_daily')
        .select('date')
        .order('date', { ascending: false })
        .limit(windowDays);

    if (error || !data) {
        if (error) console.error('[getWindowMomentum] market_breadth_daily', error.message);
        return [];
    }
    return (data as { date: string }[]).map((r) => r.date).reverse(); // 升冪
}

async function fetchDiffEvents(
    supabase: Supabase,
    minDate: string,
    maxDate: string,
): Promise<WindowDiffEvent[]> {
    const PAGE_SIZE = 1000;
    const all: WindowDiffEvent[] = [];
    let offset = 0;

    while (true) {
        const { data, error } = await supabase
            .from('etf_diff_logs')
            .select('etf_code, stock_code, stock_name, data_date, diff_shares, diff_weight')
            .gte('data_date', minDate)
            .lte('data_date', maxDate)
            .range(offset, offset + PAGE_SIZE - 1);

        if (error) {
            console.error('[getWindowMomentum] etf_diff_logs', error.message);
            break;
        }
        if (!data || data.length === 0) break;
        all.push(...(data as WindowDiffEvent[]));
        if (data.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
    }

    return all;
}

interface OhlcvRow {
    stock_code: string;
    data_date: string;
    open: number | null;
    high: number | null;
    low: number | null;
    close: number | null;
    volume: number | null;
}

async function fetchWindowOhlcv(
    supabase: Supabase,
    stockCodes: string[],
    minDate: string,
    maxDate: string,
): Promise<OhlcvRow[]> {
    const PAGE_SIZE = 1000;
    const all: OhlcvRow[] = [];
    let offset = 0;

    while (true) {
        const { data, error } = await supabase
            .from('stock_prices_daily')
            .select('stock_code, data_date, open, high, low, close, volume')
            .in('stock_code', stockCodes)
            .gte('data_date', minDate)
            .lte('data_date', maxDate)
            .range(offset, offset + PAGE_SIZE - 1);

        if (error) {
            console.error('[getWindowMomentum] stock_prices_daily', error.message);
            break;
        }
        if (!data || data.length === 0) break;
        all.push(...(data as OhlcvRow[]));
        if (data.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
    }

    return all;
}

async function computeWindowMomentum(
    windowDays: number,
    minEtfCount: number,
): Promise<WindowMomentumResult> {
    const supabase = getPublicClient();

    const windowDates = await fetchWindowTradingDates(supabase, windowDays);
    if (windowDates.length === 0) {
        return { stocks: [], windowStart: '', windowEnd: '' };
    }
    const minDate = windowDates[0];
    const maxDate = windowDates[windowDates.length - 1];

    const events = await fetchDiffEvents(supabase, minDate, maxDate);
    const aggregated = aggregateWindowMomentum(events, minEtfCount);
    if (aggregated.length === 0) {
        return { stocks: [], windowStart: minDate, windowEnd: maxDate };
    }

    // 過濾後才抓 OHLCV，避免為落選個股查價
    const codes = aggregated.map((s) => s.stockCode);
    const ohlcvRows = await fetchWindowOhlcv(supabase, codes, minDate, maxDate);

    const candlesByStock = new Map<string, MomentumCandle[]>();
    for (const row of ohlcvRows) {
        if (row.open === null || row.high === null || row.low === null || row.close === null) continue;
        let list = candlesByStock.get(row.stock_code);
        if (!list) {
            list = [];
            candlesByStock.set(row.stock_code, list);
        }
        list.push({
            date: row.data_date,
            open: Number(row.open),
            high: Number(row.high),
            low: Number(row.low),
            close: Number(row.close),
            volume: Number(row.volume ?? 0),
        });
    }

    const stocks: WindowMomentumStock[] = aggregated.map((agg) => {
        const candles = (candlesByStock.get(agg.stockCode) ?? []).sort((a, b) =>
            a.date.localeCompare(b.date),
        );
        const windowVolume = candles.length > 0
            ? candles.reduce((acc, c) => acc + c.volume, 0)
            : null;
        const first = candles[0];
        const last = candles[candles.length - 1];
        const priceChangePercent =
            candles.length >= 2 && first.close > 0
                ? ((last.close - first.close) / first.close) * 100
                : null;

        return {
            stockCode: agg.stockCode,
            stockName: agg.stockName,
            etfCount: agg.etfCount,
            totalAccumulatedShares: agg.totalAccumulatedShares,
            totalWeightChange: agg.totalWeightChange,
            maxSingleWeightChange: agg.maxSingleWeightChange,
            absorptionRatio: computeAbsorptionRatio(agg.totalAccumulatedShares, windowVolume),
            absorptionTrend: computeAbsorptionTrend(agg.sharesByDate, windowDates),
            priceChangePercent,
            etfDetails: agg.etfDetails,
            candles,
        };
    });

    return { stocks, windowStart: minDate, windowEnd: maxDate };
}

export async function getWindowMomentum(
    windowDays: number,
    minEtfCount: number,
): Promise<WindowMomentumResult> {
    const cached = unstable_cache(
        () => computeWindowMomentum(windowDays, minEtfCount),
        ['window-momentum', String(windowDays), String(minEtfCount)],
        { revalidate: 3600 },
    );
    return cached();
}
