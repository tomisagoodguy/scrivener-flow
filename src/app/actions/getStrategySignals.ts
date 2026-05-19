'use server';

import { createClient } from '@/lib/supabase/server';
import { computeMovement } from '@/lib/investment/strategyUtils';
import { ETF_CODES } from '@/lib/investment/etfRegistry';
import { getStrategyDescriptions } from './strategyRegistry';
import type { DiffEvent, StrategyStock, StrategyEntry, StrategySignalsResult } from '@/lib/investment/strategyUtils';

const PORTFOLIO_ETF = '00981A';

export async function getStrategySignals(date?: string): Promise<StrategySignalsResult | null> {
    const supabase = await createClient();

    let targetDate = date;
    if (!targetDate) {
        const { data: latestRow, error: dateErr } = await supabase
            .from('strategy_signals')
            .select('date')
            .order('date', { ascending: false })
            .limit(1)
            .single();

        if (dateErr || !latestRow) return null;
        targetDate = latestRow.date as string;
    }

    const { data: signals, error: sigErr } = await supabase
        .from('strategy_signals')
        .select('strategy_id, stock_id, score')
        .eq('date', targetDate)
        .eq('is_selected', true);

    if (sigErr || !signals || signals.length === 0) return null;

    const allStockIds = [...new Set(signals.map((s) => s.stock_id as string))];

    const sevenDaysAgo = new Date(targetDate);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    const [{ data: holdingRows }, { data: diffRows }, { data: stockInfoRows }] = await Promise.all([
        supabase
            .from('etf_holdings_snapshot')
            .select('stock_code, etf_code')
            .in('etf_code', ETF_CODES)
            .in('stock_code', allStockIds),
        supabase
            .from('etf_diff_logs')
            .select('stock_code, change_type, diff_weight')
            .eq('etf_code', PORTFOLIO_ETF)
            .gte('data_date', sevenDaysAgoStr)
            .lte('data_date', targetDate)
            .in('stock_code', allStockIds),
        supabase
            .from('stock_basic_info')
            .select('stock_code, name_short, industry')
            .in('stock_code', allStockIds),
    ]);

    const holdingsSet = new Set<string>(
        (holdingRows ?? []).filter((h) => h.etf_code === PORTFOLIO_ETF).map((h) => h.stock_code as string),
    );

    const etfHoldersMap = new Map<string, string[]>();
    for (const row of holdingRows ?? []) {
        const code = row.stock_code as string;
        const etfCode = row.etf_code as string;
        if (!etfHoldersMap.has(code)) etfHoldersMap.set(code, []);
        etfHoldersMap.get(code)!.push(etfCode);
    }

    const diffEvents: DiffEvent[] = (diffRows ?? []).map((r) => ({
        stock_id: r.stock_code as string,
        change_type: r.change_type as string,
        diff_weight: (r.diff_weight as number) ?? 0,
    }));

    const stockInfoMap = new Map<string, { name: string | null; industry: string | null }>();
    for (const row of stockInfoRows ?? []) {
        stockInfoMap.set(row.stock_code as string, {
            name: (row.name_short as string | null) ?? null,
            industry: (row.industry as string | null) ?? null,
        });
    }

    const strategyMap = new Map<string, StrategyStock[]>();
    for (const sig of signals) {
        const strategyId = sig.strategy_id as string;
        const stockId = sig.stock_id as string;
        const info = stockInfoMap.get(stockId) ?? { name: null, industry: null };
        if (!strategyMap.has(strategyId)) strategyMap.set(strategyId, []);
        strategyMap.get(strategyId)!.push({
            stock_id: stockId,
            score: sig.score as number | null,
            movement: computeMovement(stockId, holdingsSet, diffEvents),
            name: info.name,
            industry: info.industry,
            etfHolders: etfHoldersMap.get(stockId) ?? [],
        });
    }

    const descriptions = getStrategyDescriptions();

    const strategies: StrategyEntry[] = [...strategyMap.entries()].map(([id, stocks]) => ({
        id,
        description: descriptions[id] ?? id,
        stocks,
    }));

    return { date: targetDate, strategies };
}
