'use server';

import { createClient } from '@/lib/supabase/server';

export interface SectorRow {
    category: string;
    ret_1d: number | null;
    ret_5d: number | null;
    ret_20d: number | null;
    stock_count: number;
}

export interface SectorStock {
    stock_id: string;
    stock_name: string | null;
    ret_1d: number | null;
    ret_5d: number | null;
    ret_20d: number | null;
    is_strategy_hit: boolean;
    momentum_score: number | null;
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
        .select('category, ret_1d, ret_5d, ret_20d, stock_count')
        .eq('date', queryDate)
        .order('ret_1d', { ascending: false });

    if (error) {
        console.error('[getSectorStrength]', error.message);
        return { date: queryDate, sectors: [] };
    }

    return { date: queryDate, sectors: (data ?? []) as SectorRow[] };
}

export async function getSectorStocks(category: string, date: string): Promise<SectorStock[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('sector_strength_stocks')
        .select('stock_id, stock_name, ret_1d, ret_5d, ret_20d, is_strategy_hit, momentum_score')
        .eq('date', date)
        .eq('category', category)
        .order('ret_1d', { ascending: false });

    if (error) {
        console.error('[getSectorStocks]', error.message);
        return [];
    }

    return (data ?? []) as SectorStock[];
}
