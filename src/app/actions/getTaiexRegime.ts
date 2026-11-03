'use server';

import { unstable_cache } from 'next/cache';
import { getPublicClient } from '@/lib/supabase/service';

export type TaiexBreakType = 'first_break' | 'rebreak_rising' | 'break_falling';
export type TaiexRegimeState = 'above' | 'below_after_first_break' | 'below_after_rebreak' | 'below_ma_falling';
export type TaiexStatsKey = TaiexBreakType | 'down_day';

/** 某類事件的 20 日後歷史統計（pipeline TaiexMa60RegimeStep 每日全歷史重算） */
export interface TaiexClassStats {
    n: number;
    next_day_up_rate: number | null;
    median_r20: number | null;
    mean_r20: number | null;
    up_rate_r20: number | null;
    /** 20 日內曾收在季線上的次數；收黑日基準為 null */
    back_above_within20: number | null;
    median_min_low20: number | null;
    count_min_low_below_5pct: number | null;
    sample_start: string | null;
    sample_end: string | null;
}

export interface TaiexRegime {
    date: string;
    close: number;
    ma60: number | null;
    ma60_slope20: number | null;
    ma_rising: boolean | null;
    days_above: number | null;
    break_type: TaiexBreakType | null;
    state: TaiexRegimeState;
    wave_break_count: number | null;
    next_break_threshold: number | null;
    next_break_type: TaiexBreakType | null;
    stats: Partial<Record<TaiexStatsKey, TaiexClassStats>>;
}

async function _getTaiexRegime(): Promise<TaiexRegime | null> {
    const { data, error } = await getPublicClient()
        .from('taiex_ma60_regime_daily')
        .select('date, close, ma60, ma60_slope20, ma_rising, days_above, break_type, state, wave_break_count, next_break_threshold, next_break_type, stats')
        .order('date', { ascending: false })
        .limit(1);
    if (error) {
        // 拋錯而非回空：unstable_cache 不快取例外，避免一次短暫失敗讓卡片空白一小時
        throw new Error(`taiex_ma60_regime_daily query failed: ${error.message}`);
    }
    const rows = (data ?? []) as TaiexRegime[];
    return rows[0] ?? null;
}

/** 加權指數季線狀態最新一列；查無資料或查詢失敗回 null。 */
export async function getTaiexRegime(): Promise<TaiexRegime | null> {
    const cached = unstable_cache(_getTaiexRegime, ['taiex-regime-v1'], { revalidate: 3600 });
    try {
        return await cached();
    } catch (e: unknown) {
        console.error('[getTaiexRegime]', e instanceof Error ? e.message : e);
        return null;
    }
}
