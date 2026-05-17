'use server';

import { createClient } from '@/lib/supabase/server';
import { buildEtfSectorActivityMap, type EtfSectorActivityMap } from '@/lib/investment/etfSectorActivityUtils';

export type { EtfSectorActivityMap } from '@/lib/investment/etfSectorActivityUtils';

type DiffLogRow = {
    stock_code: string;
    etf_code: string;
    diff_weight: number;
    change_type: string;
};

async function fetchAllSectorStocks(
    supabase: Awaited<ReturnType<typeof createClient>>,
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
        all.push(...data);
        if (data.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
    }

    return all;
}

async function fetchAllDiffLogs(
    supabase: Awaited<ReturnType<typeof createClient>>,
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

export async function getEtfSectorActivity(sectorDate: string): Promise<EtfSectorActivityMap> {
    if (sectorDate === '') return {};

    const parsedDate = new Date(sectorDate);
    if (isNaN(parsedDate.getTime())) return {};

    const supabase = await createClient();

    const cutoff = new Date(parsedDate);
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const [allStocks, diffLogs] = await Promise.all([
        fetchAllSectorStocks(supabase, sectorDate),
        fetchAllDiffLogs(supabase, cutoffStr, sectorDate),
    ]);

    const stockToCategory = new Map(allStocks.map((s) => [s.stock_id, s.category]));
    return buildEtfSectorActivityMap(stockToCategory, diffLogs);
}
