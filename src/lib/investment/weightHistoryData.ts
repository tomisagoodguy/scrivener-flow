import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchAllRows } from '@/lib/supabase/fetchAllRows';

/** 每批並行頁數（估算：17,281 列從 18 次依序往返降為 5 批；以 00981A 實測確認） */
const PAGE_CONCURRENCY = 4;

export interface WeightHistoryFilter {
    etfCodes?: string[];
    stockCode?: string;
    /** YYYY-MM-DD，含當日 */
    fromDate?: string;
}

/**
 * 讀取 `etf_weight_history`，自動分頁讀完所有符合列。
 *
 * 固定以 `data_date`、`etf_code`、`stock_code` 排序（每日約千列同日期，只依日期排序跨頁會重複或漏列）。
 * 任一頁失敗即拋錯，不回傳部分資料。
 *
 * @param supabase 任一 Supabase client（server / public / browser）
 * @param filter 只套用有值的條件
 * @param columns 逗號分隔欄位字串
 */
export function fetchWeightHistory<T>(
    supabase: SupabaseClient,
    filter: WeightHistoryFilter,
    columns: string,
): Promise<T[]> {
    return fetchAllRows<T>('etf_weight_history', (from, to) => {
        let query = supabase.from('etf_weight_history').select(columns);
        if (filter.etfCodes && filter.etfCodes.length > 0) query = query.in('etf_code', filter.etfCodes);
        if (filter.stockCode) query = query.eq('stock_code', filter.stockCode);
        if (filter.fromDate) query = query.gte('data_date', filter.fromDate);
        return query
            .order('data_date', { ascending: true })
            .order('etf_code', { ascending: true })
            .order('stock_code', { ascending: true })
            .range(from, to);
    }, { concurrency: PAGE_CONCURRENCY });
}
