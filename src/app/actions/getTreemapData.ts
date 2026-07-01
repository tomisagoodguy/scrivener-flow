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
    turnover: number | null;
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

        const { data: rawStocks } = await supabase
            .from('market_treemap_daily')
            .select('stock_code, stock_name, industry, market_cap, close, change_pct, turnover')
            .eq('date', latestDate)
            .gt('close', 0);

        const stocks = (rawStocks ?? []) as TreemapStock[];

        // stock_name 可能是 null（pipeline 未寫入），從 stock_basic_info 補齊
        const nullNameCodes = stocks
            .filter((s) => !s.stock_name)
            .map((s) => s.stock_code);

        const nameMap: Record<string, string> = {};
        if (nullNameCodes.length > 0) {
            const { data: basicRows } = await supabase
                .from('stock_basic_info')
                .select('stock_code, name_short')
                .in('stock_code', nullNameCodes);
            for (const r of (basicRows ?? []) as Array<{ stock_code: string; name_short: string | null }>) {
                if (r.name_short) nameMap[r.stock_code] = r.name_short;
            }
        }

        const filled: TreemapStock[] = stocks.map((s) => ({
            ...s,
            stock_name: s.stock_name ?? nameMap[s.stock_code] ?? null,
        }));

        return {
            date: latestDate,
            stocks: filled,
        };
    },
    ['treemap-data-v2'],
    { revalidate: 3600 },
);

export async function getTreemapData(): Promise<TreemapData> {
    return _getTreemapData();
}
