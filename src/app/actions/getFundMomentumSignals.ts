'use server';

import { createClient } from '@/lib/supabase/server';
import type { FundMomentumSignal } from '@/types';

const STRATEGY_ID = 'fund_momentum';
const ETF_CONSENSUS_SCORE_THRESHOLD = 70;

interface SignalRow {
    stock_id: string;
    date: string;
    score: number | null;
    is_selected: boolean | null;
    conditions: Record<string, unknown> | null;
}

interface DiffLogRow {
    stock_code: string;
    data_date: string;
}

interface StockInfoRow {
    stock_code: string;
    name_short: string | null;
}

export async function getFundMomentumSignals(
    stockCodes: string[],
): Promise<FundMomentumSignal[]> {
    if (stockCodes.length === 0) return [];

    const supabase = await createClient();

    // 查最新日期
    const { data: latestRow } = await supabase
        .from('strategy_signals')
        .select('date')
        .eq('strategy_id', STRATEGY_ID)
        .order('date', { ascending: false })
        .limit(1)
        .single();

    if (!latestRow) return [];

    const targetDate = (latestRow as unknown as { date: string }).date;

    // 平行查詢 strategy_signals + etf_diff_logs + stock_basic_info
    const [{ data: signals }, { data: diffLogs }, { data: stockInfo }] = await Promise.all([
        supabase
            .from('strategy_signals')
            .select('stock_id, date, score, is_selected, conditions')
            .eq('strategy_id', STRATEGY_ID)
            .eq('date', targetDate)
            .in('stock_id', stockCodes),
        supabase
            .from('etf_diff_logs')
            .select('stock_code, data_date')
            .eq('data_date', targetDate)
            .in('stock_code', stockCodes)
            .in('change_type', ['BUY', 'IN']),
        supabase
            .from('stock_basic_info')
            .select('stock_code, name_short')
            .in('stock_code', stockCodes),
    ]);

    // ETF 當日有加碼的股票集合（用於 etf_consensus 判定）
    const etfBuySet = new Set<string>(
        ((diffLogs ?? []) as DiffLogRow[]).map((r) => r.stock_code),
    );

    const nameMap = new Map<string, string | null>(
        ((stockInfo ?? []) as StockInfoRow[]).map((r) => [r.stock_code, r.name_short]),
    );

    const typedSignals = (signals ?? []) as SignalRow[];

    return typedSignals.map((sig): FundMomentumSignal => {
        const meta = sig.conditions ?? {};
        const score = sig.score ?? 0;

        return {
            stock_id: sig.stock_id,
            stock_name: nameMap.get(sig.stock_id) ?? null,
            date: sig.date,
            score,
            is_selected: sig.is_selected ?? false,
            fund_1d: (meta['fund_1d'] as number | null) ?? null,
            fund_5d: (meta['fund_5d'] as number | null) ?? null,
            fund_20d: (meta['fund_20d'] as number | null) ?? null,
            consec_days: (meta['consec_days'] as number | null) ?? 0,
            fund_ratio_5d: (meta['fund_ratio_5d'] as number | null) ?? null,
            // score >= 70 且 ETF 同日有加碼
            etf_consensus: score >= ETF_CONSENSUS_SCORE_THRESHOLD && etfBuySet.has(sig.stock_id),
        };
    });
}
