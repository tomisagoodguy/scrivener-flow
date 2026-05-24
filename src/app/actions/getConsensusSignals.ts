'use server';

import { createClient } from '@/lib/supabase/server';
import type { ConsensusSignal } from '@/types';

const FUND_STRATEGY_ID = 'fund_momentum';
const QUANT_STRATEGY_IDS = ['super8888', 'capital_layer', 'low_vol_cap', 'broker_ranked', 'low_vol_alpha'];
const FUND_SCORE_THRESHOLD = 70;

interface FundRow {
    stock_id: string;
    score: number | null;
    conditions: Record<string, unknown> | null;
}

interface QuantRow {
    stock_id: string;
    strategy_id: string;
}

interface DiffLogRow {
    stock_code: string;
    etf_code: string;
}

interface StockInfoRow {
    stock_code: string;
    name_short: string | null;
}

export async function getConsensusSignals(): Promise<{ signals: ConsensusSignal[]; date: string | null }> {
    const supabase = await createClient();

    const { data: latestRow } = await supabase
        .from('strategy_signals')
        .select('date')
        .eq('strategy_id', FUND_STRATEGY_ID)
        .order('date', { ascending: false })
        .limit(1)
        .single();

    if (!latestRow) return { signals: [], date: null };

    const targetDate = (latestRow as unknown as { date: string }).date;

    const [
        { data: fundRows },
        { data: quantRows },
        { data: diffRows },
        { data: infoRows },
    ] = await Promise.all([
        supabase
            .from('strategy_signals')
            .select('stock_id, score, conditions')
            .eq('strategy_id', FUND_STRATEGY_ID)
            .eq('date', targetDate),
        supabase
            .from('strategy_signals')
            .select('stock_id, strategy_id')
            .in('strategy_id', QUANT_STRATEGY_IDS)
            .eq('date', targetDate)
            .eq('is_selected', true),
        supabase
            .from('etf_diff_logs')
            .select('stock_code, etf_code')
            .eq('data_date', targetDate)
            .in('change_type', ['BUY', 'IN']),
        supabase
            .from('stock_basic_info')
            .select('stock_code, name_short'),
    ]);

    // ETF 加碼：stock_code → etf_code[]
    const etfMap = new Map<string, string[]>();
    for (const r of (diffRows ?? []) as DiffLogRow[]) {
        const list = etfMap.get(r.stock_code) ?? [];
        if (!list.includes(r.etf_code)) list.push(r.etf_code);
        etfMap.set(r.stock_code, list);
    }

    // 量化策略命中：stock_id → strategy_id[]
    const quantMap = new Map<string, string[]>();
    for (const r of (quantRows ?? []) as QuantRow[]) {
        const list = quantMap.get(r.stock_id) ?? [];
        if (!list.includes(r.strategy_id)) list.push(r.strategy_id);
        quantMap.set(r.stock_id, list);
    }

    // 投信：stock_id → { score, consec_days }
    const fundMap = new Map<string, { score: number; consec_days: number }>();
    for (const r of (fundRows ?? []) as FundRow[]) {
        fundMap.set(r.stock_id, {
            score: r.score ?? 0,
            consec_days: (r.conditions?.['consec_days'] as number | null) ?? 0,
        });
    }

    // 名稱
    const nameMap = new Map<string, string | null>(
        ((infoRows ?? []) as StockInfoRow[]).map((r) => [r.stock_code, r.name_short]),
    );

    const allStocks = new Set([...etfMap.keys(), ...fundMap.keys(), ...quantMap.keys()]);

    const result: ConsensusSignal[] = [];
    for (const stockId of allStocks) {
        const etfEtfs = etfMap.get(stockId) ?? [];
        const fund = fundMap.get(stockId);
        const stratHits = quantMap.get(stockId) ?? [];

        const etfBuying = etfEtfs.length > 0;
        const fundBuying = (fund?.score ?? 0) >= FUND_SCORE_THRESHOLD;
        const hasQuant = stratHits.length > 0;

        result.push({
            stock_id: stockId,
            stock_name: nameMap.get(stockId) ?? null,
            date: targetDate,
            etf_buying: etfBuying,
            etf_etfs: etfEtfs,
            fund_score: fund?.score ?? null,
            fund_buying: fundBuying,
            fund_consec_days: fund?.consec_days ?? 0,
            strategy_hits: stratHits,
            consensus_count: (etfBuying ? 1 : 0) + (fundBuying ? 1 : 0) + (hasQuant ? 1 : 0),
        });
    }

    result.sort((a, b) =>
        b.consensus_count !== a.consensus_count
            ? b.consensus_count - a.consensus_count
            : (b.fund_score ?? 0) - (a.fund_score ?? 0),
    );

    return { signals: result, date: targetDate };
}
