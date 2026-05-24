'use server';

import { createClient } from '@/lib/supabase/server';
import type { BareKSnapshot } from '@/app/api/investment/bare-k/[code]/route';

/**
 * 批次查詢多支股票的最新裸K快照。
 * 回傳 Map<stock_id, BareKSnapshot | null>，無快照的股票值為 null。
 */
export async function getStrategySnapshots(
    stockIds: string[]
): Promise<Map<string, BareKSnapshot | null>> {
    const map = new Map<string, BareKSnapshot | null>(stockIds.map((id) => [id, null]));
    if (stockIds.length === 0) return map;

    const supabase = await createClient();
    const { data, error } = await supabase
        .from('bare_k_snapshots')
        .select('stock_id, date, ohlcv, mas, signals, margin, revenue, inv_chips, summary')
        .in('stock_id', stockIds)
        .order('date', { ascending: false });

    if (error) {
        console.error('[getStrategySnapshots]', error);
        return map;
    }

    // 取每支股票最新一筆（已按 date desc 排序，取第一次出現的）
    for (const row of data ?? []) {
        if (!map.has(row.stock_id)) continue;
        if (map.get(row.stock_id) === null) {
            map.set(row.stock_id, row as BareKSnapshot);
        }
    }

    return map;
}
