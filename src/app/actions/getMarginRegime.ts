'use server';

import { unstable_cache } from 'next/cache';
import { getPublicClient } from '@/lib/supabase/service';
import type { MarginRegime } from '@/lib/investment/marginRegime';

async function _getMarginRegime(): Promise<MarginRegime | null> {
    const { data, error } = await getPublicClient()
        .from('market_margin_regime_daily')
        .select('date, margin_balance, margin_1y_high, index_near_high, stats')
        .order('date', { ascending: false })
        .limit(1);
    if (error) {
        // 拋錯而非回空：unstable_cache 不快取例外，避免一次短暫失敗讓卡片空白一小時
        throw new Error(`market_margin_regime_daily query failed: ${error.message}`);
    }
    const rows = (data ?? []) as MarginRegime[];
    return rows[0] ?? null;
}

/** 融資創一年新高狀態最新一列；查無資料或查詢失敗回 null。 */
export async function getMarginRegime(): Promise<MarginRegime | null> {
    const cached = unstable_cache(_getMarginRegime, ['margin-regime-v1'], { revalidate: 3600 });
    try {
        return await cached();
    } catch (e: unknown) {
        console.error('[getMarginRegime]', e instanceof Error ? e.message : e);
        return null;
    }
}
