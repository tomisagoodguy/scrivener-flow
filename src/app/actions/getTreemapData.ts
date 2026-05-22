'use server';

import { unstable_cache } from 'next/cache';
import { getPublicClient } from '@/lib/supabase/service';

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

const _getTreemapData = unstable_cache(
    async (): Promise<TreemapData> => {
        const supabase = getPublicClient();

        const { data: latestRow } = await supabase
            .from('market_treemap_daily')
            .select('date')
            .order('date', { ascending: false })
            .limit(1)
            .single();

        if (!latestRow) return { date: '', stocks: [] };
        const latestDate = (latestRow as { date: string }).date;

        const { data: stocks } = await supabase
            .from('market_treemap_daily')
            .select('stock_code, stock_name, industry, market_cap, close, change_pct')
            .eq('date', latestDate)
            .gt('market_cap', 0);

        return {
            date: latestDate,
            stocks: (stocks ?? []) as TreemapStock[],
        };
    },
    ['treemap-data'],
    { revalidate: 3600 },
);

export async function getTreemapData(): Promise<TreemapData> {
    return _getTreemapData();
}
