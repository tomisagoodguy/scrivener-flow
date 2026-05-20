'use server';

import { createClient } from '@/lib/supabase/server';

export interface TreemapStock {
    stock_code: string;
    stock_name: string | null;
    industry: string | null;
    market_cap: number | null;
    close: number | null;
    change_pct: number | null;
}

export interface TreemapData {
    date: string;
    stocks: TreemapStock[];
}

export async function getTreemapData(): Promise<TreemapData> {
    const supabase = await createClient();

    // 取最新日期
    const { data: latestRow } = await supabase
        .from('market_treemap_daily')
        .select('date')
        .order('date', { ascending: false })
        .limit(1)
        .single();

    if (!latestRow) return { date: '', stocks: [] };

    const { data: stocks } = await supabase
        .from('market_treemap_daily')
        .select('stock_code, stock_name, industry, market_cap, close, change_pct')
        .eq('date', latestRow.date)
        .gt('market_cap', 0);

    return {
        date: latestRow.date as string,
        stocks: (stocks ?? []) as TreemapStock[],
    };
}
