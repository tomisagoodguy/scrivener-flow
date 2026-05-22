'use server';

import { unstable_cache } from 'next/cache';
import { getPublicClient } from '@/lib/supabase/service';
import { buildEtfSectorActivityMap, type EtfSectorActivityMap } from '@/lib/investment/etfSectorActivityUtils';
import { ETF_CODES } from '@/lib/investment/etfRegistry';

export type { EtfSectorActivityMap } from '@/lib/investment/etfSectorActivityUtils';

interface DiffLogRow {
    stock_code: string;
    etf_code: string;
    diff_weight: number;
    change_type: string;
}

async function fetchAllSectorStocks(
    supabase: ReturnType<typeof getPublicClient>,
    sectorDate: string,
): Promise<{ stock_id: string; category: string }[]> {
    const PAGE_SIZE = 1000;
    const all: { stock_id: string; category: string }[] = [];
    let offset = 0;

    while (true) {
        const { data, error } = await supabase
            .from('sector_strength_stocks')
            .select('stock_id, category')
            .eq('date', sectorDate)
            .range(offset, offset + PAGE_SIZE - 1);

        if (error) {
            console.error('[getEtfSectorActivity] sector_strength_stocks', error.message);
            break;
        }
        if (!data || data.length === 0) break;
        all.push(...(data as { stock_id: string; category: string }[]));
        if (data.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
    }

    return all;
}

async function fetchAllDiffLogs(
    supabase: ReturnType<typeof getPublicClient>,
    cutoffStr: string,
    sectorDate: string,
): Promise<DiffLogRow[]> {
    const PAGE_SIZE = 1000;
    const all: DiffLogRow[] = [];
    let offset = 0;

    while (true) {
        const { data, error } = await supabase
            .from('etf_diff_logs')
            .select('stock_code, etf_code, diff_weight, change_type')
            .in('change_type', ['BUY', 'IN'])
            .gte('data_date', cutoffStr)
            .lte('data_date', sectorDate)
            .range(offset, offset + PAGE_SIZE - 1);

        if (error) {
            console.error('[getEtfSectorActivity] etf_diff_logs', error.message);
            break;
        }
        if (!data || data.length === 0) break;
        all.push(...(data as DiffLogRow[]));
        if (data.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
    }

    return all;
}

async function fetchHoldingsStockEtfMap(
    supabase: ReturnType<typeof getPublicClient>,
): Promise<Record<string, string[]>> {
    const { data: dateRow } = await supabase
        .from('etf_holdings_snapshot')
        .select('data_date')
        .in('etf_code', ETF_CODES)
        .order('data_date', { ascending: false })
        .limit(1);

    const latestDate = (dateRow as { data_date: string }[] | null)?.[0]?.data_date;
    if (!latestDate) return {};

    const PAGE_SIZE = 1000;
    const map: Record<string, string[]> = {};
    let offset = 0;

    while (true) {
        const { data, error } = await supabase
            .from('etf_holdings_snapshot')
            .select('stock_code, etf_code')
            .in('etf_code', ETF_CODES)
            .eq('data_date', latestDate)
            .range(offset, offset + PAGE_SIZE - 1);

        if (error) {
            console.error('[getEtfSectorActivity] etf_holdings_snapshot', error.message);
            break;
        }
        if (!data || data.length === 0) break;
        for (const row of data as { stock_code: string; etf_code: string }[]) {
            if (!map[row.stock_code]) map[row.stock_code] = [];
            if (!map[row.stock_code].includes(row.etf_code)) {
                map[row.stock_code].push(row.etf_code);
            }
        }
        if (data.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
    }

    return map;
}

async function _fetchEtfSectorActivity(sectorDate: string): Promise<EtfSectorActivityMap> {
    if (sectorDate === '') return {};

    const parsedDate = new Date(sectorDate);
    if (isNaN(parsedDate.getTime())) return {};

    const supabase = getPublicClient();

    const cutoff = new Date(parsedDate);
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const [allStocks, diffLogs, holdingsMap] = await Promise.all([
        fetchAllSectorStocks(supabase, sectorDate),
        fetchAllDiffLogs(supabase, cutoffStr, sectorDate),
        fetchHoldingsStockEtfMap(supabase),
    ]);

    const stockToCategory = new Map(allStocks.map((s) => [s.stock_id, s.category]));

    const activityMap = buildEtfSectorActivityMap(stockToCategory, diffLogs);

    for (const stock of allStocks) {
        const { stock_id, category } = stock;
        const etfs = holdingsMap[stock_id];
        if (!etfs || etfs.length === 0) continue;

        if (!activityMap[category]) {
            activityMap[category] = { etf_codes: [], stock_codes: [], stock_etf_map: {} };
        }
        activityMap[category].stock_etf_map[stock_id] = etfs;
    }

    return activityMap;
}

export async function getEtfSectorActivity(sectorDate: string): Promise<EtfSectorActivityMap> {
    const cached = unstable_cache(
        () => _fetchEtfSectorActivity(sectorDate),
        ['etf-sector-activity', sectorDate],
        { revalidate: 3600 },
    );
    return cached();
}
