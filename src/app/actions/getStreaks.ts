'use server';

import { unstable_cache } from 'next/cache';
import { getPublicClient } from '@/lib/supabase/service';
import { ETF_CODES } from '@/lib/investment/etfRegistry';
import { computeStreaks, type DiffEvent, type StreaksResult } from '@/lib/investment/streakUtils';

const EMPTY: StreaksResult = { stockBuy: [], stockSell: [], etfBuy: [], etfSell: [], asOfDate: '' };

const PAGE_SIZE = 1000;

/**
 * 抓取全部 etf_diff_logs(diff_shares <> 0)的 streak 計算所需欄位。
 * Supabase 單次查詢預設上限 1000 列,故以 range 分頁讀完。
 */
async function fetchAllDiffEvents(): Promise<DiffEvent[]> {
    const supabase = getPublicClient();
    const all: DiffEvent[] = [];

    for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await supabase
            .from('etf_diff_logs')
            .select('etf_code, stock_code, stock_name, data_date, diff_shares')
            .in('etf_code', ETF_CODES)
            .neq('diff_shares', 0)
            .order('data_date', { ascending: true })
            .range(from, from + PAGE_SIZE - 1);

        if (error) throw new Error(error.message);

        const rows = (data ?? []) as DiffEvent[];
        all.push(...rows);
        if (rows.length < PAGE_SIZE) break;
    }

    return all;
}

const _getStreaks = unstable_cache(
    async (): Promise<StreaksResult> => {
        try {
            const events = await fetchAllDiffEvents();
            if (events.length === 0) return EMPTY;
            return computeStreaks(events);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error('[getStreaks] failed:', msg);
            return EMPTY;
        }
    },
    ['etf-streaks'],
    { revalidate: 3600 },
);

/**
 * 回傳四視角目前進行中的連續同向加減碼榜單。
 * 查詢失敗或無資料時回傳空榜單(各陣列為 []、asOfDate 為 ''),不拋錯。
 */
export async function getStreaks(): Promise<StreaksResult> {
    return _getStreaks();
}
