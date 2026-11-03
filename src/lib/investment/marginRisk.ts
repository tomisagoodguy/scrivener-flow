/**
 * 融資使用率全市場百分位：高融資判斷、曝險彙總、百分位查詢。
 *
 * 百分位由 ETF pipeline 以全市場合格股計算後存於 stock_prices_daily.margin_pct_rank
 * （0–100，不合格為 NULL）。歷史大跌日實測前 20% 跌幅顯著較重，故門檻取 80。
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export const HIGH_MARGIN_PCT = 80;

export function isHighMargin(pct: number | null | undefined): boolean {
    return pct != null && pct >= HIGH_MARGIN_PCT;
}

export interface MarginExposureSummary {
    total: number;
    highCount: number;
    /** 高融資者 weight 加總，單位與輸入相同（%） */
    highWeight: number;
    unknownCount: number;
}

export function summarizeMarginExposure(
    items: { margin_pct_rank?: number | null; weight?: number | null }[]
): MarginExposureSummary {
    const summary: MarginExposureSummary = { total: items.length, highCount: 0, highWeight: 0, unknownCount: 0 };
    for (const item of items) {
        if (item.margin_pct_rank == null) {
            summary.unknownCount += 1;
        } else if (isHighMargin(item.margin_pct_rank)) {
            summary.highCount += 1;
            summary.highWeight += item.weight ?? 0;
        }
    }
    return summary;
}

/** 每個代碼取 stock_prices_daily 最新一列的百分位；查無資料的代碼不出現在結果中。查詢失敗時 throw。 */
export async function fetchMarginPctRanks(
    supabase: SupabaseClient,
    codes: string[]
): Promise<Record<string, number | null>> {
    if (codes.length === 0) return {};

    const { data, error } = await supabase
        .from('stock_prices_daily')
        .select('stock_code, data_date, margin_pct_rank')
        .in('stock_code', codes)
        .order('data_date', { ascending: false })
        .limit(2 * codes.length);
    if (error) throw new Error(`fetchMarginPctRanks failed: ${error.message}`);

    const result: Record<string, number | null> = {};
    for (const row of data ?? []) {
        if (row.stock_code in result) continue;
        result[row.stock_code] = row.margin_pct_rank == null ? null : Number(row.margin_pct_rank);
    }
    return result;
}
