import 'server-only';
import { createClient } from '@/lib/supabase/server';

export interface EquityRow {
    stock_code: string;
    stock_name: string | null;
    total_shareholders: number | null;
    shareholders_change_rate: number | null;
    big_holder_pct_change: number | null;
    mid_holder_pct_change: number | null;
    whale_holder_pct_change: number | null;
}

export interface PriceIndicator {
    is_200d_high: boolean;
    is_20d_high: boolean;
    it_buy_5d: number | null;
    amount: number | null;
}

export interface RankingData {
    snapshotDate: string;
    bigHolderRanking: EquityRow[];
    retailDeclineRanking: EquityRow[];
    doubleSignalRanking: EquityRow[];
    priceIndicators: Record<string, PriceIndicator>;
}

export type SortKey =
    | 'total_shareholders'
    | 'shareholders_change_rate'
    | 'big_holder_pct_change'
    | 'mid_holder_pct_change'
    | 'whale_holder_pct_change'
    | 'it_buy_5d'
    | 'amount';

export type SortDir = 'asc' | 'desc';
export type Tier = '200' | '400' | '1000';

const TIER_SORT_KEY: Record<Tier, SortKey> = {
    '200': 'mid_holder_pct_change',
    '400': 'big_holder_pct_change',
    '1000': 'whale_holder_pct_change',
};

const DB_SORT_KEYS = new Set<SortKey>([
    'total_shareholders',
    'shareholders_change_rate',
    'big_holder_pct_change',
    'mid_holder_pct_change',
    'whale_holder_pct_change',
]);

export async function fetchPriceIndicators(stockCodes: string[]): Promise<Record<string, PriceIndicator>> {
    if (stockCodes.length === 0) return {};
    const supabase = await createClient();

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 310);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const BATCH = 20;
    const batches: string[][] = [];
    for (let i = 0; i < stockCodes.length; i += BATCH) batches.push(stockCodes.slice(i, i + BATCH));

    const batchResults = await Promise.all(
        batches.map(batch =>
            supabase
                .from('stock_prices_daily')
                .select('stock_code, close, amount, it_buy')
                .in('stock_code', batch)
                .gte('data_date', cutoffStr)
                .order('data_date', { ascending: false })
                .limit(batch.length * 220)
        )
    );

    const byCode: Record<string, { close: number; amount: number | null; it_buy: number | null }[]> = {};
    for (const { data } of batchResults) {
        if (!data) continue;
        for (const row of data) {
            if (!byCode[row.stock_code]) byCode[row.stock_code] = [];
            byCode[row.stock_code].push({
                close: Number(row.close),
                amount: row.amount != null ? Number(row.amount) : null,
                it_buy: row.it_buy != null ? Number(row.it_buy) : null,
            });
        }
    }

    const result: Record<string, PriceIndicator> = {};
    for (const [code, prices] of Object.entries(byCode)) {
        if (prices.length === 0) continue;
        const latest = prices[0];
        const prices200 = prices.slice(0, 200);
        const max200 = prices200.reduce((m, p) => Math.max(m, p.close), 0);
        const prices20 = prices.slice(0, 20);
        const max20 = prices20.reduce((m, p) => Math.max(m, p.close), 0);
        const it5 = prices.slice(0, 5).map(p => p.it_buy).filter((v): v is number => v !== null);
        result[code] = {
            is_200d_high: prices200.length >= 60 && latest.close >= max200,
            is_20d_high: prices20.length >= 20 && latest.close >= max20,
            it_buy_5d: it5.length > 0 ? it5.reduce((s, v) => s + v, 0) : null,
            amount: latest.amount,
        };
    }
    return result;
}

export function applySortToRows(
    rows: EquityRow[],
    sort: SortKey | null,
    dir: SortDir,
    priceIndicators: Record<string, PriceIndicator>
): EquityRow[] {
    if (!sort || DB_SORT_KEYS.has(sort)) return rows;
    return [...rows].sort((a, b) => {
        const aVal = sort === 'it_buy_5d'
            ? (priceIndicators[a.stock_code]?.it_buy_5d ?? null)
            : (priceIndicators[a.stock_code]?.amount ?? null);
        const bVal = sort === 'it_buy_5d'
            ? (priceIndicators[b.stock_code]?.it_buy_5d ?? null)
            : (priceIndicators[b.stock_code]?.amount ?? null);
        if (aVal === null && bVal === null) return 0;
        if (aVal === null) return 1;
        if (bVal === null) return -1;
        return dir === 'asc' ? aVal - bVal : bVal - aVal;
    });
}

export async function fetchRankingData(sort: SortKey | null, dir: SortDir, tier: Tier | null): Promise<RankingData | null> {
    const supabase = await createClient();

    const { data: latestRow } = await supabase
        .from('equity_distribution_stats')
        .select('snapshot_date')
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .single();

    if (!latestRow) return null;
    const snapshotDate: string = latestRow.snapshot_date;

    const tierKey = tier ? TIER_SORT_KEY[tier] : null;
    const effectiveSort = sort ?? tierKey;
    const bigSortKey = (effectiveSort && DB_SORT_KEYS.has(effectiveSort)) ? effectiveSort : 'big_holder_pct_change';
    const bigSortAsc = (effectiveSort && DB_SORT_KEYS.has(effectiveSort)) ? dir === 'asc' : false;

    let retailQuery = supabase
        .from('equity_distribution_stats')
        .select('stock_code, stock_name, total_shareholders, shareholders_change_rate, big_holder_pct_change, mid_holder_pct_change, whale_holder_pct_change')
        .eq('snapshot_date', snapshotDate)
        .not('shareholders_change_rate', 'is', null)
        .order('shareholders_change_rate', { ascending: true });

    if (tierKey) retailQuery = retailQuery.gt(tierKey, 0);

    const [{ data: bigHolder }, { data: retailDecline }] = await Promise.all([
        supabase
            .from('equity_distribution_stats')
            .select('stock_code, stock_name, total_shareholders, shareholders_change_rate, big_holder_pct_change, mid_holder_pct_change, whale_holder_pct_change')
            .eq('snapshot_date', snapshotDate)
            .gt('big_holder_pct_change', 0)
            .order(bigSortKey, { ascending: bigSortAsc }),
        retailQuery,
    ]);

    const allCodes = [...new Set([
        ...(bigHolder ?? []).map(r => r.stock_code),
        ...(retailDecline ?? []).map(r => r.stock_code),
    ])];
    const priceIndicators = await fetchPriceIndicators(allCodes);

    const doubleSignalRanking = (bigHolder ?? [])
        .filter(row => (row.shareholders_change_rate ?? 0) < 0)
        .sort((a, b) => (b.big_holder_pct_change ?? 0) - (a.big_holder_pct_change ?? 0))
        .slice(0, 10) as EquityRow[];

    return {
        snapshotDate,
        bigHolderRanking: applySortToRows((bigHolder ?? []) as EquityRow[], sort, dir, priceIndicators),
        retailDeclineRanking: applySortToRows((retailDecline ?? []) as EquityRow[], sort, dir, priceIndicators),
        doubleSignalRanking,
        priceIndicators,
    };
}
