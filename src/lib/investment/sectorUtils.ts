import { createClient } from '@/lib/supabase/server';

export async function fetchSectorCategoryMap(codes: string[]): Promise<Record<string, string>> {
    if (codes.length === 0) return {};
    const supabase = await createClient();

    const { data: latestRow } = await supabase
        .from('sector_strength_stocks')
        .select('date')
        .order('date', { ascending: false })
        .limit(1);

    const latestDate = latestRow?.[0]?.date;
    const map: Record<string, string> = {};

    if (latestDate) {
        const { data: sectorData } = await supabase
            .from('sector_strength_stocks')
            .select('stock_id, category')
            .eq('date', latestDate)
            .in('stock_id', codes);

        for (const row of sectorData ?? []) {
            if (!map[row.stock_id]) map[row.stock_id] = row.category;
        }
    }

    const missingCodes = codes.filter(c => !map[c]);
    if (missingCodes.length > 0) {
        const { data: fallbackData } = await supabase
            .from('stock_basic_info')
            .select('stock_code, industry')
            .in('stock_code', missingCodes);
        for (const row of fallbackData ?? []) {
            if (row.industry) map[row.stock_code] = row.industry;
        }
    }

    return map;
}
