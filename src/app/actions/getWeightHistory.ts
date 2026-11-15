'use server';

import { unstable_cache } from 'next/cache';
import { getPublicClient } from '@/lib/supabase/service';
import { fetchWeightHistory, type WeightHistoryFilter } from '@/lib/investment/weightHistoryData';
import type { WeightHistoryRow } from '@/app/investment/history/page';

const WINDOW_DAYS = 90;
const COLUMNS = 'etf_code, stock_code, stock_name, data_date, weight, rank';

/** 股票／ETF 代碼：英數字 1–10 碼。空代碼會讓查詢退化成「全部 ETF × 90 天」，必須擋下。 */
const CODE_PATTERN = /^[0-9A-Za-z]{1,10}$/;

function assertCode(code: string): void {
    if (!CODE_PATTERN.test(code)) throw new Error(`Invalid code: ${JSON.stringify(code)}`);
}

function windowStart(): string {
    return new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10);
}

function read(filter: Omit<WeightHistoryFilter, 'fromDate'>): Promise<WeightHistoryRow[]> {
    return fetchWeightHistory<WeightHistoryRow>(getPublicClient(), { ...filter, fromDate: windowStart() }, COLUMNS);
}

/** 單一 ETF 近 90 天持股比重歷史（history 頁「各 ETF 排名史」按需載入）；失敗拋錯。 */
export async function getEtfWeightHistory90d(etfCode: string): Promise<WeightHistoryRow[]> {
    assertCode(etfCode);
    return unstable_cache(() => read({ etfCodes: [etfCode] }), ['etf-weight-history-90d-v1', etfCode], {
        revalidate: 3600,
    })();
}

/** 單一股票跨所有 ETF 近 90 天持股比重歷史（history 頁「個股跨 ETF」按需載入）；失敗拋錯。 */
export async function getStockWeightHistory90d(stockCode: string): Promise<WeightHistoryRow[]> {
    assertCode(stockCode);
    return unstable_cache(() => read({ stockCode }), ['stock-weight-history-90d-v1', stockCode], {
        revalidate: 3600,
    })();
}
