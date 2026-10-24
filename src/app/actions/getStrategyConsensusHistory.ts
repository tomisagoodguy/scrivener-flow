'use server';

import { unstable_cache } from 'next/cache';
import { getPublicClient } from '@/lib/supabase/service';
import { CONSENSUS_WINDOW_DAYS } from '@/lib/investment/strategyConsensusUtils';
import type { ConsensusHistoryRow, ConsensusStockInfoRow } from '@/lib/investment/strategyConsensusUtils';

/** Supabase 單次回傳上限；以 range() 分頁取完 */
const PAGE_SIZE = 1000;
/** stock_basic_info 的 in() 分批大小，避免 URL 過長 */
const INFO_CHUNK_SIZE = 300;

export interface StrategyConsensusHistoryData {
    rows: ConsensusHistoryRow[];
    stockInfo: ConsensusStockInfoRow[];
}

const EMPTY: StrategyConsensusHistoryData = { rows: [], stockInfo: [] };

async function _getStrategyConsensusHistory(days: number): Promise<StrategyConsensusHistoryData> {
    const supabase = getPublicClient();

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const windowStart = new Date(today);
    windowStart.setDate(windowStart.getDate() - days);
    const windowStartStr = windowStart.toISOString().split('T')[0];

    const rows: ConsensusHistoryRow[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await supabase
            .from('strategy_signals')
            .select('strategy_id, stock_id, date')
            .eq('is_selected', true)
            .gte('date', windowStartStr)
            .lte('date', todayStr)
            .order('date', { ascending: true })
            .order('stock_id', { ascending: true })
            .range(from, from + PAGE_SIZE - 1);

        if (error) {
            console.error('[getStrategyConsensusHistory] strategy_signals query failed:', error);
            return EMPTY;
        }
        const page = (data ?? []) as ConsensusHistoryRow[];
        rows.push(...page);
        if (page.length < PAGE_SIZE) break;
    }

    const stockIds = [...new Set(rows.map((r) => r.stock_id))];
    const stockInfo: ConsensusStockInfoRow[] = [];
    for (let i = 0; i < stockIds.length; i += INFO_CHUNK_SIZE) {
        const { data, error } = await supabase
            .from('stock_basic_info')
            .select('stock_code, name_short, industry')
            .in('stock_code', stockIds.slice(i, i + INFO_CHUNK_SIZE));
        if (error) {
            // 名稱補充失敗不影響共選計數，只記錄
            console.error('[getStrategyConsensusHistory] stock_basic_info query failed:', error);
            break;
        }
        stockInfo.push(...((data ?? []) as ConsensusStockInfoRow[]));
    }

    return { rows, stockInfo };
}

/** 近 N 天（7/14/30 日曆天）內被選中的策略訊號原始列；聚合交給 buildConsensusHistory。 */
export async function getStrategyConsensusHistory(days: number): Promise<StrategyConsensusHistoryData> {
    if (!CONSENSUS_WINDOW_DAYS.some((d) => d === days)) return EMPTY;

    const cached = unstable_cache(
        () => _getStrategyConsensusHistory(days),
        ['strategy-consensus-history-v1', String(days)],
        { revalidate: 3600 },
    );
    return cached();
}
