'use server';

import { unstable_cache } from 'next/cache';
import { getPublicClient } from '@/lib/supabase/service';

export interface SectorRow {
    category: string;
    ret_1d: number | null;
    ret_5d: number | null;
    ret_20d: number | null;
    stock_count: number;
    total_amount: number | null;
    breadth: number | null;
    avg_amount_5d: number | null;
    strength_score: number | null;
}

export interface SectorStock {
    stock_id: string;
    stock_name: string | null;
    ret_1d: number | null;
    ret_5d: number | null;
    ret_20d: number | null;
    is_strategy_hit: boolean;
    momentum_score: number | null;
    amount: number | null;
    category?: string;
    // 籌碼確認欄位（僅 getSectorStocks 填入）
    big_holder_pct_change?: number | null;   // 400張+ 週變化 (pp)
    mid_holder_pct_change?: number | null;   // 200張+ 週變化 (pp)
    whale_holder_pct_change?: number | null; // 1000張+ 週變化 (pp)
    it_buy_5d?: number | null;               // 投信近5日買賣超
}

export interface SectorData {
    date: string;
    sectors: SectorRow[];
}

const _getSectorStrength = unstable_cache(
    async (): Promise<SectorData> => {
        const supabase = getPublicClient();

        const { data: latest } = await supabase
            .from('sector_strength')
            .select('date')
            .order('date', { ascending: false })
            .limit(1);

        if (!latest || latest.length === 0) return { date: '', sectors: [] };
        const queryDate: string = (latest as { date: string }[])[0].date;

        const { data, error } = await supabase
            .from('sector_strength')
            .select('category, ret_1d, ret_5d, ret_20d, stock_count, total_amount, breadth, avg_amount_5d, strength_score')
            .eq('date', queryDate)
            .order('ret_1d', { ascending: false });

        if (error) {
            console.error('[getSectorStrength]', error.message);
            return { date: queryDate, sectors: [] };
        }

        const seen = new Set<string>();
        const deduped = (data as SectorRow[] ?? []).filter((row) => {
            if (seen.has(row.category)) return false;
            seen.add(row.category);
            return true;
        });

        return { date: queryDate, sectors: deduped as SectorRow[] };
    },
    ['sector-strength'],
    { revalidate: 3600 },
);

export async function getSectorStrength(): Promise<SectorData> {
    return _getSectorStrength();
}

export async function getAllStrategyHitStocks(date: string): Promise<SectorStock[]> {
    const cached = unstable_cache(
        async () => {
            const supabase = getPublicClient();

            const { data, error } = await supabase
                .from('sector_strength_stocks')
                .select('stock_id, stock_name, ret_1d, ret_5d, ret_20d, is_strategy_hit, momentum_score, amount, category')
                .eq('date', date)
                .eq('is_strategy_hit', true)
                .order('momentum_score', { ascending: false, nullsFirst: false });

            if (error) {
                console.error('[getAllStrategyHitStocks]', error.message);
                return [];
            }

            // 同一 stock_id 可能跨多族群重複出現，保留 momentum_score 最高的那筆
            const seen = new Map<string, SectorStock>();
            for (const row of (data ?? []) as SectorStock[]) {
                if (!seen.has(row.stock_id)) {
                    seen.set(row.stock_id, row);
                }
            }
            return Array.from(seen.values());
        },
        ['all-strategy-hit-stocks-v2', date],
        { revalidate: 3600 },
    );
    return cached();
}

export async function getAllSectorStocks(date: string): Promise<Record<string, SectorStock[]>> {
    const cached = unstable_cache(
        async () => {
            const supabase = getPublicClient();
            const PAGE_SIZE = 1000;
            const allStocks: SectorStock[] = [];
            let offset = 0;

            while (true) {
                const { data, error } = await supabase
                    .from('sector_strength_stocks')
                    .select('stock_id, stock_name, ret_1d, ret_5d, ret_20d, is_strategy_hit, momentum_score, amount, category')
                    .eq('date', date)
                    .order('amount', { ascending: false, nullsFirst: false })
                    .range(offset, offset + PAGE_SIZE - 1);

                if (error) {
                    console.error('[getAllSectorStocks]', error.message);
                    break;
                }

                if (!data || data.length === 0) break;
                allStocks.push(...(data as SectorStock[]));
                if (data.length < PAGE_SIZE) break;
                offset += PAGE_SIZE;
            }

            const groupedMap: Record<string, Map<string, SectorStock>> = {};
            for (const stock of allStocks) {
                const cat = stock.category ?? '';
                if (!groupedMap[cat]) groupedMap[cat] = new Map();
                if (!groupedMap[cat].has(stock.stock_id)) {
                    groupedMap[cat].set(stock.stock_id, stock);
                }
            }
            return Object.fromEntries(
                Object.entries(groupedMap).map(([cat, map]) => [cat, Array.from(map.values())])
            );
        },
        ['all-sector-stocks', date],
        { revalidate: 3600 },
    );
    return cached();
}

interface EquityChangeRow { stock_code: string; big_holder_pct_change: number | string | null; mid_holder_pct_change: number | string | null; whale_holder_pct_change: number | string | null }
interface PriceItBuyRow { stock_code: string; it_buy: number | string | null }

async function fetchChipData(stockCodes: string[]): Promise<Record<string, Pick<SectorStock, 'big_holder_pct_change' | 'mid_holder_pct_change' | 'whale_holder_pct_change' | 'it_buy_5d'>>> {
    if (stockCodes.length === 0) return {};
    const supabase = getPublicClient();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 14);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    // 取全局最新 snapshot 日期（不依賴特定股票，避免該股無資料時靜默失敗）
    const { data: latestDateRow } = await supabase
        .from('equity_distribution_stats')
        .select('snapshot_date')
        .order('snapshot_date', { ascending: false })
        .limit(1);
    const latestDate: string | null = (latestDateRow as { snapshot_date: string }[] | null)?.[0]?.snapshot_date ?? null;

    const [{ data: equityRows }, { data: priceRows }] = await Promise.all([
        latestDate
            ? supabase.from('equity_distribution_stats')
                .select('stock_code, big_holder_pct_change, mid_holder_pct_change, whale_holder_pct_change')
                .eq('snapshot_date', latestDate)
                .in('stock_code', stockCodes)
            : Promise.resolve({ data: [] }),
        supabase.from('stock_prices_daily')
            .select('stock_code, it_buy')
            .in('stock_code', stockCodes)
            .gte('data_date', cutoffStr)
            .order('data_date', { ascending: false }),
    ]);

    const itBuySum: Record<string, number[]> = {};
    for (const row of (priceRows ?? []) as PriceItBuyRow[]) {
        if (row.it_buy != null && (itBuySum[row.stock_code]?.length ?? 0) < 5) {
            if (!itBuySum[row.stock_code]) itBuySum[row.stock_code] = [];
            itBuySum[row.stock_code].push(Number(row.it_buy));
        }
    }

    const result: Record<string, Pick<SectorStock, 'big_holder_pct_change' | 'mid_holder_pct_change' | 'whale_holder_pct_change' | 'it_buy_5d'>> = {};
    for (const row of (equityRows ?? []) as EquityChangeRow[]) {
        result[row.stock_code] = {
            big_holder_pct_change: row.big_holder_pct_change != null ? Number(row.big_holder_pct_change) : null,
            mid_holder_pct_change: row.mid_holder_pct_change != null ? Number(row.mid_holder_pct_change) : null,
            whale_holder_pct_change: row.whale_holder_pct_change != null ? Number(row.whale_holder_pct_change) : null,
            it_buy_5d: itBuySum[row.stock_code] ? itBuySum[row.stock_code].reduce((a, b) => a + b, 0) : null,
        };
    }
    for (const code of stockCodes) {
        if (result[code] === undefined && itBuySum[code]) {
            result[code] = {
                big_holder_pct_change: null,
                mid_holder_pct_change: null,
                whale_holder_pct_change: null,
                it_buy_5d: itBuySum[code].reduce((a, b) => a + b, 0),
            };
        }
    }
    return result;
}

export async function getSectorStocks(category: string, date: string): Promise<SectorStock[]> {
    const cached = unstable_cache(
        async () => {
            const supabase = getPublicClient();

            const { data, error } = await supabase
                .from('sector_strength_stocks')
                .select('stock_id, stock_name, ret_1d, ret_5d, ret_20d, is_strategy_hit, momentum_score, amount, category')
                .eq('date', date)
                .eq('category', category)
                .order('amount', { ascending: false, nullsFirst: false });

            if (error) {
                console.error('[getSectorStocks]', error.message);
                return [];
            }

            const stocks = (data ?? []) as SectorStock[];
            const chipData = await fetchChipData(stocks.map(s => s.stock_id));
            return stocks.map(s => ({ ...s, ...chipData[s.stock_id] }));
        },
        ['sector-stocks-v2', category, date],
        { revalidate: 3600 },
    );
    return cached();
}
