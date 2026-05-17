'use server';

import { createClient } from '@/lib/supabase/server';
import { computeMovement } from '@/lib/investment/strategyUtils';
import type { DiffEvent, StrategyStock, StrategyEntry, StrategySignalsResult } from '@/lib/investment/strategyUtils';

export async function getStrategySignals(date?: string): Promise<StrategySignalsResult | null> {
    const supabase = await createClient();

    // Step 1: Resolve the target date (most recent if not specified)
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

    // Step 2: Fetch selected signals for target date
    const { data: signals, error: sigErr } = await supabase
        .from('strategy_signals')
        .select('strategy_id, stock_id, score')
        .eq('date', targetDate)
        .eq('is_selected', true);

    if (sigErr || !signals || signals.length === 0) return null;

    const allStockIds = [...new Set(signals.map((s) => s.stock_id as string))];

    // Step 3: Fetch 00981A current holdings
    const { data: holdingRows } = await supabase
        .from('etf_holdings_snapshot')
        .select('stock_code')
        .eq('etf_code', '00981A')
        .in('stock_code', allStockIds);

    const holdingsSet = new Set<string>((holdingRows ?? []).map((h) => h.stock_code as string));

    // Step 4: Fetch etf_diff_logs for last 7 days for 00981A
    const sevenDaysAgo = new Date(targetDate);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    const { data: diffRows } = await supabase
        .from('etf_diff_logs')
        .select('stock_code, change_type, diff_weight')
        .eq('etf_code', '00981A')
        .gte('data_date', sevenDaysAgoStr)
        .lte('data_date', targetDate)
        .in('stock_code', allStockIds);

    const diffEvents: DiffEvent[] = (diffRows ?? []).map((r) => ({
        stock_id: r.stock_code as string,
        change_type: r.change_type as string,
        diff_weight: (r.diff_weight as number) ?? 0,
    }));

    // Step 5: Group signals by strategy_id and annotate movement
    const strategyMap = new Map<string, StrategyStock[]>();
    for (const sig of signals) {
        const strategyId = sig.strategy_id as string;
        const stockId = sig.stock_id as string;
        if (!strategyMap.has(strategyId)) strategyMap.set(strategyId, []);
        strategyMap.get(strategyId)!.push({
            stock_id: stockId,
            score: sig.score as number | null,
            movement: computeMovement(stockId, holdingsSet, diffEvents),
        });
    }

    // Step 6: Fetch strategy descriptions from a static registry
    const { getStrategyDescriptions } = await import('./strategyRegistry');
    const descriptions = getStrategyDescriptions();

    const strategies: StrategyEntry[] = [...strategyMap.entries()].map(([id, stocks]) => ({
        id,
        description: descriptions[id] ?? id,
        stocks,
    }));

    return { date: targetDate, strategies };
}
