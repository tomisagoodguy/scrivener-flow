import 'server-only';
import { unstable_cache } from 'next/cache';
import { getPublicClient } from '@/lib/supabase/service';

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

export interface FlowEntry {
    nt: number;
    direction: 'in' | 'out';
    etf_count: number;
}

export interface RankingData {
    snapshotDate: string;
    bigHolderRanking: EquityRow[];
    retailDeclineRanking: EquityRow[];
    doubleSignalRanking: EquityRow[];
    priceIndicators: Record<string, PriceIndicator>;
    etfMap: Record<string, string[]>;
    flowMap: Record<string, FlowEntry>;
    weeks: Weeks;
    dateRange: { from: string; to: string };
    insufficientData?: boolean;
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
export type Weeks = 1 | 2 | 3 | 4;
type TierSortKey = 'big_holder_pct_change' | 'mid_holder_pct_change' | 'whale_holder_pct_change';

const TIER_SORT_KEY: Record<Tier, TierSortKey> = {
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
    const supabase = getPublicClient();

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

    type PriceRow = { stock_code: string; close: unknown; amount: unknown; it_buy: unknown };
    const byCode: Record<string, { close: number; amount: number | null; it_buy: number | null }[]> = {};
    for (const { data } of batchResults) {
        if (!data) continue;
        for (const row of data as PriceRow[]) {
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

async function fetchFlowMap(): Promise<Record<string, FlowEntry>> {
    const supabase = getPublicClient();

    const { data } = await supabase
        .from('etf_flow_daily')
        .select('inflow, outflow')
        .gt('totals->>stocks_count', '0')
        .order('data_date', { ascending: false })
        .limit(1)
        .single();

    if (!data) return {};

    type RawStock = { stock_code: string; total_nt: number; etf_count: number };
    type FlowData = { inflow: RawStock[] | null; outflow: RawStock[] | null };
    const flowData = data as unknown as FlowData;
    const map: Record<string, FlowEntry> = {};

    for (const s of flowData.inflow ?? []) {
        map[s.stock_code] = { nt: s.total_nt, direction: 'in', etf_count: s.etf_count };
    }
    for (const s of flowData.outflow ?? []) {
        if (!map[s.stock_code]) {
            map[s.stock_code] = { nt: s.total_nt, direction: 'out', etf_count: s.etf_count };
        }
    }
    return map;
}

async function fetchEtfMap(stockCodes: string[]): Promise<Record<string, string[]>> {
    if (stockCodes.length === 0) return {};
    const supabase = getPublicClient();

    type OverlapDateRow = { data_date: string };
    type OverlapRow = { stock_code: string; etf_list: { etf_code: string }[] | null };

    const { data: latestRaw } = await supabase
        .from('etf_stock_overlap')
        .select('data_date')
        .order('data_date', { ascending: false })
        .limit(1)
        .single();

    const latest = latestRaw as unknown as OverlapDateRow | null;
    if (!latest) return {};

    const { data: rawData } = await supabase
        .from('etf_stock_overlap')
        .select('stock_code, etf_list')
        .eq('data_date', latest.data_date)
        .in('stock_code', stockCodes);

    const map: Record<string, string[]> = {};
    for (const row of (rawData as unknown as OverlapRow[]) ?? []) {
        const list = row.etf_list ?? [];
        map[row.stock_code] = list.map(e => e.etf_code);
    }
    return map;
}

function formatDateMD(dateStr: string): string {
    const parts = dateStr.split('-');
    return `${parts[1]}/${parts[2]}`;
}

type EqStatDateRow = { snapshot_date: string };
type EqStatCurrentRow = {
    stock_code: string;
    stock_name: string | null;
    total_shareholders: number | null;
    big_holder_pct: number | null;
    mid_holder_pct: number | null;
    whale_holder_pct: number | null;
};
type EqStatOldRow = {
    stock_code: string;
    total_shareholders: number | null;
    big_holder_pct: number | null;
    mid_holder_pct: number | null;
    whale_holder_pct: number | null;
};

async function _fetchRankingData(sort: SortKey | null, dir: SortDir, tier: Tier | null, weeks: Weeks): Promise<RankingData | null> {
    const supabase = getPublicClient();

    const { data: latestRaw } = await supabase
        .from('equity_distribution_stats')
        .select('snapshot_date')
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .single();

    const latestRow = latestRaw as unknown as EqStatDateRow | null;
    if (!latestRow) return null;
    const snapshotDate: string = latestRow.snapshot_date;

    // Fetch previous N distinct snapshot dates (needed for multi-week comparison)
    const { data: prevRaw } = await supabase
        .from('equity_distribution_stats')
        .select('snapshot_date')
        .lt('snapshot_date', snapshotDate)
        .order('snapshot_date', { ascending: false })
        .limit(weeks * 1000);

    const prevRows = prevRaw as unknown as EqStatDateRow[] | null;
    const prevDates: string[] = [];
    const seen = new Set<string>();
    for (const row of prevRows ?? []) {
        const d = row.snapshot_date;
        if (!seen.has(d)) {
            seen.add(d);
            prevDates.push(d);
            if (prevDates.length >= weeks) break;
        }
    }

    const dateRange = {
        from: formatDateMD(prevDates.at(-1) ?? snapshotDate),
        to: formatDateMD(snapshotDate),
    };

    if (prevDates.length < weeks) {
        return {
            snapshotDate,
            bigHolderRanking: [],
            retailDeclineRanking: [],
            doubleSignalRanking: [],
            priceIndicators: {},
            etfMap: {},
            flowMap: {},
            weeks,
            dateRange,
            insufficientData: true,
        };
    }

    const oldDate = prevDates[weeks - 1];
    const tierKey = tier ? TIER_SORT_KEY[tier] : null;
    const changeField: keyof Pick<EquityRow, 'big_holder_pct_change' | 'mid_holder_pct_change' | 'whale_holder_pct_change'> =
        tier === '200' ? 'mid_holder_pct_change' :
        tier === '1000' ? 'whale_holder_pct_change' :
        'big_holder_pct_change';

    const CURRENT_SELECT = 'stock_code, stock_name, total_shareholders, big_holder_pct, mid_holder_pct, whale_holder_pct';
    const OLD_SELECT = 'stock_code, total_shareholders, big_holder_pct, mid_holder_pct, whale_holder_pct';

    const [{ data: currentRaw }, { data: oldRaw }] = await Promise.all([
        supabase.from('equity_distribution_stats').select(CURRENT_SELECT).eq('snapshot_date', snapshotDate),
        supabase.from('equity_distribution_stats').select(OLD_SELECT).eq('snapshot_date', oldDate),
    ]);

    const currentRows = currentRaw as unknown as EqStatCurrentRow[] | null;
    const oldRows = oldRaw as unknown as EqStatOldRow[] | null;

    // Build old pct lookup map
    const oldPctMap = new Map<string, { total: number | null; big: number | null; mid: number | null; whale: number | null }>();
    for (const row of oldRows ?? []) {
        oldPctMap.set(row.stock_code, {
            total: row.total_shareholders != null ? Number(row.total_shareholders) : null,
            big: row.big_holder_pct != null ? Number(row.big_holder_pct) : null,
            mid: row.mid_holder_pct != null ? Number(row.mid_holder_pct) : null,
            whale: row.whale_holder_pct != null ? Number(row.whale_holder_pct) : null,
        });
    }

    // Compute N-week pct changes; override _change fields with dynamic values
    const allRows: EquityRow[] = (currentRows ?? []).map(row => {
        const old = oldPctMap.get(row.stock_code);
        const curBig = row.big_holder_pct != null ? Number(row.big_holder_pct) : null;
        const curMid = row.mid_holder_pct != null ? Number(row.mid_holder_pct) : null;
        const curWhale = row.whale_holder_pct != null ? Number(row.whale_holder_pct) : null;
        return {
            stock_code: row.stock_code,
            stock_name: row.stock_name,
            total_shareholders: row.total_shareholders != null ? Number(row.total_shareholders) : null,
            shareholders_change_rate: (row.total_shareholders != null && old?.total != null && old.total > 0)
                ? Math.round((Number(row.total_shareholders) - old.total) / old.total * 10000) / 100
                : null,
            big_holder_pct_change: (curBig != null && old?.big != null) ? curBig - old.big : null,
            mid_holder_pct_change: (curMid != null && old?.mid != null) ? curMid - old.mid : null,
            whale_holder_pct_change: (curWhale != null && old?.whale != null) ? curWhale - old.whale : null,
        };
    });

    // Filter big holder ranking: N-week change > 0 for the relevant tier
    let bigHolder = allRows.filter(r => (r[changeField] ?? 0) > 0);
    if (tierKey) bigHolder = bigHolder.filter(r => (r[tierKey] ?? 0) > 0);

    // App-layer sort: DB sort keys sorted here; price indicator keys handled by applySortToRows
    const effectiveSort = sort ?? tierKey;
    if (effectiveSort && DB_SORT_KEYS.has(effectiveSort)) {
        const s = effectiveSort as keyof EquityRow;
        bigHolder = [...bigHolder].sort((a, b) => {
            const aVal = a[s] as number | null ?? null;
            const bVal = b[s] as number | null ?? null;
            if (aVal === null && bVal === null) return 0;
            if (aVal === null) return 1;
            if (bVal === null) return -1;
            return dir === 'asc' ? aVal - bVal : bVal - aVal;
        });
    } else if (!effectiveSort || !['it_buy_5d', 'amount'].includes(effectiveSort)) {
        bigHolder = [...bigHolder].sort((a, b) => (b[changeField] ?? 0) - (a[changeField] ?? 0));
    }

    // Retail decline: always filter by 1-week shareholders_change_rate (pre-computed field)
    let retailDecline = allRows.filter(r => (r.shareholders_change_rate ?? 0) < 0);
    if (tierKey) retailDecline = retailDecline.filter(r => (r[tierKey] ?? 0) > 0);
    retailDecline = [...retailDecline].sort((a, b) => (a.shareholders_change_rate ?? 0) - (b.shareholders_change_rate ?? 0));

    const allCodes = [...new Set([
        ...bigHolder.map(r => r.stock_code),
        ...retailDecline.map(r => r.stock_code),
    ])];
    const [priceIndicators, etfMap, flowMap] = await Promise.all([
        fetchPriceIndicators(allCodes),
        fetchEtfMap(allCodes),
        fetchFlowMap(),
    ]);

    const doubleSignalRanking = bigHolder
        .filter(row => (row.shareholders_change_rate ?? 0) < 0)
        .sort((a, b) => (b[changeField] ?? 0) - (a[changeField] ?? 0))
        .slice(0, 10);

    return {
        snapshotDate,
        bigHolderRanking: applySortToRows(bigHolder, sort, dir, priceIndicators),
        retailDeclineRanking: applySortToRows(retailDecline, sort, dir, priceIndicators),
        doubleSignalRanking,
        priceIndicators,
        etfMap,
        flowMap,
        weeks,
        dateRange,
    };
}

export async function fetchRankingData(sort: SortKey | null, dir: SortDir, tier: Tier | null, weeks: Weeks = 1): Promise<RankingData | null> {
    const cached = unstable_cache(
        () => _fetchRankingData(sort, dir, tier, weeks),
        ['equity-ranking', sort ?? 'null', dir, tier ?? 'null', String(weeks)],
        { revalidate: 3600 },
    );
    return cached();
}
