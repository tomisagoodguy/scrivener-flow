'use server';

import { getPublicClient } from '@/lib/supabase/service';
import {
    buildHoldingMarks,
    type StrategyHoldingMarks,
    type StrategyHoldingRow,
} from '@/lib/investment/strategyTradeUtils';

/** Supabase 單次回傳上限；以 range() 分頁取完 */
const PAGE_SIZE = 1000;
/** in() 分批大小，避免 URL 過長 */
const STOCK_CHUNK_SIZE = 300;
/** 只取持有中或此天數內出場的紀錄，涵蓋裸K快照長度 */
const LOOKBACK_DAYS = 400;

/**
 * 策略圖表視角用：查指定股票的 strategy_trades，彙整成每股「選」「買」日期與持有區間。
 * 查詢錯誤時拋錯，由呼叫端決定是否以空物件繼續。
 */
export async function getStrategyChartTrades(stockIds: string[]): Promise<Record<string, StrategyHoldingMarks>> {
    if (stockIds.length === 0) return {};
    const supabase = getPublicClient();
    const cutoff = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString().split('T')[0];

    const rows: StrategyHoldingRow[] = [];
    for (let i = 0; i < stockIds.length; i += STOCK_CHUNK_SIZE) {
        const chunk = stockIds.slice(i, i + STOCK_CHUNK_SIZE);
        for (let from = 0; ; from += PAGE_SIZE) {
            const { data, error } = await supabase
                .from('strategy_trades')
                .select('stock_id, entry_signal_date, entry_date, exit_date')
                .in('stock_id', chunk)
                .or(`exit_date.is.null,exit_date.gte.${cutoff}`)
                // 依唯一鍵 (strategy_id, stock_id, entry_signal_date) 排序，翻頁才不會漏抓或重複
                .order('strategy_id', { ascending: true })
                .order('stock_id', { ascending: true })
                .order('entry_signal_date', { ascending: true })
                .range(from, from + PAGE_SIZE - 1);
            if (error) throw new Error(`strategy_trades query failed: ${error.message}`);
            const page = (data ?? []) as StrategyHoldingRow[];
            rows.push(...page);
            if (page.length < PAGE_SIZE) break;
        }
    }
    return buildHoldingMarks(rows);
}

/** 頁面用：查詢失敗只記錄並回空物件，圖表照常顯示、只是不畫持有標記。 */
export async function getStrategyChartTradesOrEmpty(stockIds: string[]): Promise<Record<string, StrategyHoldingMarks>> {
    try {
        return await getStrategyChartTrades(stockIds);
    } catch (e: unknown) {
        console.error('[getStrategyChartTrades]', e instanceof Error ? e.message : e);
        return {};
    }
}
