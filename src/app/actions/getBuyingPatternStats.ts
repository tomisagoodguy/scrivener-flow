'use server';

import { unstable_cache } from 'next/cache';
import { getPublicClient } from '@/lib/supabase/service';
import { toPatternStats, type PatternStats, type PatternStatsRow } from '@/lib/investment/buyingPatternStats';

export type { PatternStats } from '@/lib/investment/buyingPatternStats';

// 讀 pipeline 預算的統計表（約 60 列），不聚合原始事件（PostgREST 單次上限 1000 列）
const _getBuyingPatternStats = unstable_cache(
    async (): Promise<PatternStats[]> => {
        const supabase = getPublicClient();

        const { data, error } = await supabase
            .from('etf_buying_pattern_stats')
            .select('*')
            .order('pattern_type')
            .order('horizon');

        // 在快取內 throw：失敗結果不會被快取一小時
        if (error) throw new Error(error.message);
        return toPatternStats((data ?? []) as PatternStatsRow[]);
    },
    ['buying-pattern-stats-v2'],
    { revalidate: 3600 },
);

export async function getBuyingPatternStats(): Promise<PatternStats[]> {
    try {
        return await _getBuyingPatternStats();
    } catch (err: unknown) {
        console.error('[getBuyingPatternStats] query error:', err instanceof Error ? err.message : err);
        return [];
    }
}
