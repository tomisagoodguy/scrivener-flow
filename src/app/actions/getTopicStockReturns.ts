'use server';

import { getPublicClient } from '@/lib/supabase/service';

export interface TopicStockReturn {
    change_pct: number | null;
    close: number | null;
    stock_name: string | null;
}

/**
 * 批量查詢 market_treemap_daily 最新日期的個股漲跌幅
 * change_pct 為小數格式（0.015 = 1.5%）
 */
export async function getTopicStockReturns(
    stockCodes: string[],
): Promise<Record<string, TopicStockReturn>> {
    if (stockCodes.length === 0) return {};

    const supabase = getPublicClient();

    // 取最新日期
    const { data: latestRow } = await supabase
        .from('market_treemap_daily')
        .select('date')
        .order('date', { ascending: false })
        .limit(1)
        .single();

    if (!latestRow) return {};
    const latestDate = (latestRow as { date: string }).date;

    const { data: rawRows, error } = await supabase
        .from('market_treemap_daily')
        .select('stock_code, change_pct, close, stock_name')
        .eq('date', latestDate)
        .in('stock_code', stockCodes);

    if (error || !rawRows) return {};

    const rows = rawRows as Array<{
        stock_code: string;
        change_pct: number | null;
        close: number | null;
        stock_name: string | null;
    }>;

    // 找出 stock_name 為 null 的代號，從 stock_basic_info 補齊
    const nullNameCodes = rows
        .filter((r) => !r.stock_name)
        .map((r) => r.stock_code);

    let nameMap: Record<string, string> = {};
    if (nullNameCodes.length > 0) {
        const { data: basicRows } = await supabase
            .from('stock_basic_info')
            .select('stock_code, name_short')
            .in('stock_code', nullNameCodes);
        for (const r of (basicRows ?? []) as Array<{ stock_code: string; name_short: string | null }>) {
            if (r.name_short) nameMap[r.stock_code] = r.name_short;
        }
    }

    const result: Record<string, TopicStockReturn> = {};
    for (const row of rows) {
        result[row.stock_code] = {
            change_pct: row.change_pct ?? null,
            close: row.close ?? null,
            stock_name: row.stock_name ?? nameMap[row.stock_code] ?? null,
        };
    }
    return result;
}

/**
 * 取 market_treemap_daily 最新資料日期（供頁面 header 顯示）
 */
export async function getTopicDataDate(): Promise<string | null> {
    const supabase = getPublicClient();

    const { data } = await supabase
        .from('market_treemap_daily')
        .select('date')
        .order('date', { ascending: false })
        .limit(1)
        .single();

    if (!data) return null;
    return (data as { date: string }).date;
}
