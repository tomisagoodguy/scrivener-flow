'use server';

import { unstable_cache } from 'next/cache';
import { getPublicClient } from '@/lib/supabase/service';
import {
    computePerformance,
    parseFanBreakoutConditions,
    sortFanBreakoutRows,
    type DailyPrice,
    type FanBreakoutResult,
    type FanBreakoutRow,
} from '@/lib/investment/fanBreakout';

const STRATEGY_ID = 'fan_breakout';

/**
 * 近期視窗（日曆天）：對齊 strategy_signals 的 DB 保留期（30 天），
 * 與 getStrategySignals 的 STRATEGY_WINDOW_DAYS 一致。
 */
const WINDOW_DAYS = 30;

/** Supabase 單次查詢預設上限 1000 列，故一律以 range 分頁讀完。 */
const PAGE_SIZE = 1000;

interface SignalRow {
    date: string;
    stock_id: string;
    score: number | null;
    conditions: unknown;
}

interface NameRow {
    stock_code: string;
    name_short: string | null;
    name_full: string | null;
}

interface PriceRow {
    stock_code: string;
    data_date: string;
    high: number | null;
    low: number | null;
    close: number | null;
}

interface PageResponse {
    data: unknown[] | null;
    error: { message: string } | null;
}

/** 逐頁讀完一個查詢；任何一頁失敗就丟出帶資料表名稱的 Error（不吞錯）。 */
async function fetchAllRows<T>(
    label: string,
    fetchPage: (from: number, to: number) => PromiseLike<PageResponse>,
): Promise<T[]> {
    const all: T[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
        if (error) throw new Error(`${label}: ${error.message}`);
        const rows = (data ?? []) as T[];
        all.push(...rows);
        if (rows.length < PAGE_SIZE) break;
    }
    return all;
}

function numberOrNull(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

async function _getFanBreakoutSignals(): Promise<FanBreakoutResult> {
    const supabase = getPublicClient();

    const windowStartStr = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString().split('T')[0];

    const signals = await fetchAllRows<SignalRow>('strategy_signals', (from, to) =>
        supabase
            .from('strategy_signals')
            .select('date, stock_id, score, conditions')
            .eq('strategy_id', STRATEGY_ID)
            .eq('is_selected', true)
            .gte('date', windowStartStr)
            .order('date', { ascending: false })
            .order('stock_id', { ascending: true })
            .range(from, to),
    );
    if (signals.length === 0) return { rows: [], latestDate: null };

    const codes = [...new Set(signals.map((s) => s.stock_id))];
    const earliestSignalDate = signals.reduce((min, s) => (s.date < min ? s.date : min), signals[0].date);

    const [nameRows, priceRows] = await Promise.all([
        fetchAllRows<NameRow>('stock_basic_info', (from, to) =>
            supabase
                .from('stock_basic_info')
                .select('stock_code, name_short, name_full')
                .in('stock_code', codes)
                .order('stock_code', { ascending: true })
                .range(from, to),
        ),
        fetchAllRows<PriceRow>('stock_prices_daily', (from, to) =>
            supabase
                .from('stock_prices_daily')
                .select('stock_code, data_date, high, low, close')
                .in('stock_code', codes)
                .gte('data_date', earliestSignalDate)
                .order('data_date', { ascending: true })
                .order('stock_code', { ascending: true })
                .range(from, to),
        ),
    ]);

    const nameByCode = new Map<string, string>();
    for (const row of nameRows) {
        const name = row.name_short || row.name_full;
        if (name) nameByCode.set(row.stock_code, name);
    }

    const pricesByCode = new Map<string, DailyPrice[]>();
    for (const row of priceRows) {
        const bar: DailyPrice = {
            date: row.data_date,
            high: numberOrNull(row.high),
            low: numberOrNull(row.low),
            close: numberOrNull(row.close),
        };
        const bars = pricesByCode.get(row.stock_code);
        if (bars) bars.push(bar);
        else pricesByCode.set(row.stock_code, [bar]);
    }

    const rows: FanBreakoutRow[] = signals.map((signal) => ({
        date: signal.date,
        stockId: signal.stock_id,
        name: nameByCode.get(signal.stock_id) ?? signal.stock_id,
        score: numberOrNull(signal.score),
        ...parseFanBreakoutConditions(signal.conditions),
        ...computePerformance(pricesByCode.get(signal.stock_id) ?? [], signal.date),
    }));

    const sorted = sortFanBreakoutRows(rows);
    return { rows: sorted, latestDate: sorted[0].date };
}

/**
 * 近 30 天 fan_breakout 候選（均線發散）＋訊號後績效（未還原收盤價）。
 *
 * 查詢失敗回 `{ rows: [], latestDate: null, error }`，與「無資料」`{ rows: [], latestDate: null }` 區分。
 * 錯誤以丟例外的方式離開 unstable_cache，因此不會把失敗結果快取一小時。
 */
export async function getFanBreakoutSignals(): Promise<FanBreakoutResult> {
    try {
        const cached = unstable_cache(_getFanBreakoutSignals, ['fan-breakout-signals-v1'], { revalidate: 3600 });
        return await cached();
    } catch (err: unknown) {
        const message = (err instanceof Error ? err.message : String(err)) || '查詢 fan_breakout 訊號失敗';
        console.error('[getFanBreakoutSignals] failed:', message);
        return { rows: [], latestDate: null, error: message };
    }
}
