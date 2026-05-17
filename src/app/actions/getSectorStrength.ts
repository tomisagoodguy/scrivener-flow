'use server';

import { createClient } from '@/lib/supabase/server';

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
}

export interface SectorData {
    date: string;
    sectors: SectorRow[];
}

export async function getSectorStrength(): Promise<SectorData> {
    const supabase = await createClient();

    const { data: latest } = await supabase
        .from('sector_strength')
        .select('date')
        .order('date', { ascending: false })
        .limit(1);

    if (!latest || latest.length === 0) return { date: '', sectors: [] };
    const queryDate: string = latest[0].date;

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
    const deduped = (data ?? []).filter((row) => {
        if (seen.has(row.category)) return false;
        seen.add(row.category);
        return true;
    });

    return { date: queryDate, sectors: deduped as SectorRow[] };
}

export async function getAllStrategyHitStocks(date: string): Promise<SectorStock[]> {
    const supabase = await createClient();

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

    return (data ?? []) as SectorStock[];
}

export async function getAllSectorStocks(date: string): Promise<Record<string, SectorStock[]>> {
    const supabase = await createClient();
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
}

export async function getSectorStocks(category: string, date: string): Promise<SectorStock[]> {
    const supabase = await createClient();

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

    return (data ?? []) as SectorStock[];
}
