'use server';

import { unstable_cache } from 'next/cache';
import { getPublicClient } from '@/lib/supabase/service';
import { RECENT_EXIT_DAYS } from '@/lib/investment/strategyTradeUtils';
import type { StrategyTrade } from '@/lib/investment/strategyTradeUtils';

/** Supabase 單次回傳上限；以 range() 分頁取完 */
const PAGE_SIZE = 1000;
/** stock_basic_info 的 in() 分批大小，避免 URL 過長 */
const INFO_CHUNK_SIZE = 300;

interface TradeRow {
    strategy_id: string;
    stock_id: string;
    entry_signal_date: string;
    entry_date: string | null;
    entry_price: number | null;
    exit_date: string | null;
    exit_price: number | null;
    latest_date: string | null;
    holding_return: number | null;
    post_exit_return: number | null;
}

interface StockInfoRow {
    stock_code: string;
    name_short: string | null;
    industry: string | null;
}

export interface StrategyTradePerformanceData {
    trades: StrategyTrade[];
    /** 最新資料日（各筆 latest_date 最大值）；無資料為 null */
    asOf: string | null;
}

const EMPTY: StrategyTradePerformanceData = { trades: [], asOf: null };

async function _getStrategyTradePerformance(): Promise<StrategyTradePerformanceData> {
    const supabase = getPublicClient();
    const cutoff = new Date(Date.now() - RECENT_EXIT_DAYS * 86_400_000).toISOString().split('T')[0];

    const rows: TradeRow[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await supabase
            .from('strategy_trades')
            .select(
                'strategy_id, stock_id, entry_signal_date, entry_date, entry_price, exit_date, exit_price, latest_date, holding_return, post_exit_return',
            )
            .or(`exit_date.is.null,exit_date.gte.${cutoff}`)
            .order('strategy_id', { ascending: true })
            .order('stock_id', { ascending: true })
            .order('entry_signal_date', { ascending: true })
            .range(from, from + PAGE_SIZE - 1);

        if (error) {
            // 拋錯而非回空：unstable_cache 不快取例外，避免一次短暫失敗讓面板空白一小時
            throw new Error(`strategy_trades query failed: ${error.message}`);
        }
        const page = (data ?? []) as TradeRow[];
        rows.push(...page);
        if (page.length < PAGE_SIZE) break;
    }

    const info = new Map<string, StockInfoRow>();
    const stockIds = [...new Set(rows.map((r) => r.stock_id))];
    for (let i = 0; i < stockIds.length; i += INFO_CHUNK_SIZE) {
        const { data, error } = await supabase
            .from('stock_basic_info')
            .select('stock_code, name_short, industry')
            .in('stock_code', stockIds.slice(i, i + INFO_CHUNK_SIZE));
        if (error) {
            // 名稱與產業補充失敗不影響報酬，只記錄
            console.error('[getStrategyTradePerformance] stock_basic_info query failed:', error);
            break;
        }
        for (const row of (data ?? []) as StockInfoRow[]) info.set(row.stock_code, row);
    }

    const trades: StrategyTrade[] = rows.map((r) => ({
        strategyId: r.strategy_id,
        stockId: r.stock_id,
        name: info.get(r.stock_id)?.name_short ?? null,
        industry: info.get(r.stock_id)?.industry ?? null,
        entrySignalDate: r.entry_signal_date,
        entryDate: r.entry_date,
        entryPrice: r.entry_price,
        exitDate: r.exit_date,
        exitPrice: r.exit_price,
        latestDate: r.latest_date,
        holdingReturn: r.holding_return,
        postExitReturn: r.post_exit_return,
    }));
    const asOf = rows.reduce<string | null>(
        (max, r) => (r.latest_date && (!max || r.latest_date > max) ? r.latest_date : max),
        null,
    );

    return { trades, asOf };
}

/** 策略持有中與近 60 天換出的持有期間（報酬由 pipeline 預算），附名稱與產業。 */
export async function getStrategyTradePerformance(): Promise<StrategyTradePerformanceData> {
    const cached = unstable_cache(_getStrategyTradePerformance, ['strategy-trade-performance-v1'], {
        revalidate: 3600,
    });
    try {
        return await cached();
    } catch (e: unknown) {
        console.error('[getStrategyTradePerformance]', e instanceof Error ? e.message : e);
        return EMPTY;
    }
}
