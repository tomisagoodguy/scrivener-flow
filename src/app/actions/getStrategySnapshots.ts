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

    // 逐股查詢「最新一筆」而非整批排序：bare_k_snapshots 是逐日快照表，
    // 熱門股票可能有數年歷史，.in() + 整批 order by date 需排序全部命中列，
    // 曾在多支股票同時查詢時觸發 Postgres statement timeout（57014）。
    // 改用 (stock_id, date DESC) 既有複合索引，逐股 limit(1) 走索引掃描。
    const results = await Promise.all(
        stockIds.map((id) =>
            supabase
                .from('bare_k_snapshots')
                .select('stock_id, date, ohlcv, mas, signals, margin, revenue, inv_chips, summary')
                .eq('stock_id', id)
                .order('date', { ascending: false })
                .limit(1)
                .maybeSingle()
        )
    );

    for (const { data, error } of results) {
        if (error) {
            console.error('[getStrategySnapshots]', error);
            continue;
        }
        if (data) map.set(data.stock_id, data as BareKSnapshot);
    }

    return map;
}
