'use server';

import { unstable_cache } from 'next/cache';
import { getPublicClient } from '@/lib/supabase/service';
import { computeMovement } from '@/lib/investment/strategyUtils';
import { ETF_CODES } from '@/lib/investment/etfRegistry';
import { getStrategyDescriptions } from './strategyRegistry';
import type { DiffEvent, StrategyStock, StrategyEntry, StrategySignalsResult } from '@/lib/investment/strategyUtils';

const PORTFOLIO_ETF = '00981A';

/**
 * 近期視窗（日曆天）：未指定 date 時，以「server 當日」為錨往前取此窗內各策略自身最新日期的訊號。
 * 對齊 strategy_signals 的 DB 保留期（sql_storage 的 cleanup：30 天），
 * 使更新較慢的策略只要仍在保留期內就會顯示，不因日頻策略（fund_momentum）
 * 把全域最新日期推前而被擠出視窗。
 */
const STRATEGY_WINDOW_DAYS = 30;

interface SignalRow {
    strategy_id: string;
    stock_id: string;
    score: number | null;
    date: string;
    avg_turnover: number | null;
    liquidity_flag: boolean | null;
}

async function _getStrategySignals(date?: string): Promise<StrategySignalsResult | null> {
    const supabase = getPublicClient();

    let typedSignals: SignalRow[];
    let headerDate: string;

    if (date) {
        // 顯式日期：精確比對該日期（維持既有行為）
        const { data: signals, error: sigErr } = await supabase
            .from('strategy_signals')
            .select('strategy_id, stock_id, score, date, avg_turnover, liquidity_flag')
            .eq('date', date)
            .eq('is_selected', true);

        if (sigErr || !signals || signals.length === 0) return null;
        typedSignals = signals as SignalRow[];
        headerDate = date;
    } else {
        // 未指定日期：以 server 當日為錨、往前對齊 DB 保留期的近期視窗，
        // 取窗內所有 is_selected，依 strategy_id 各取自身最新日期。
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        const windowStart = new Date(today);
        windowStart.setDate(windowStart.getDate() - STRATEGY_WINDOW_DAYS);
        const windowStartStr = windowStart.toISOString().split('T')[0];

        const { data: signals, error: sigErr } = await supabase
            .from('strategy_signals')
            .select('strategy_id, stock_id, score, date, avg_turnover, liquidity_flag')
            .eq('is_selected', true)
            .gte('date', windowStartStr)
            .lte('date', todayStr);

        if (sigErr || !signals || signals.length === 0) return null;

        const allRows = signals as SignalRow[];

        // 依 strategy_id 取各自在視窗內的最新日期
        const latestByStrategy = new Map<string, string>();
        for (const r of allRows) {
            const cur = latestByStrategy.get(r.strategy_id);
            if (!cur || r.date > cur) latestByStrategy.set(r.strategy_id, r.date);
        }
        typedSignals = allRows.filter((r) => r.date === latestByStrategy.get(r.strategy_id));
        // 頂層 date 取所有入選策略中的最新日期
        headerDate = [...latestByStrategy.values()].reduce((a, b) => (a > b ? a : b));
    }

    interface HoldingRow { stock_code: string; etf_code: string; stock_name?: string | null }
    interface DiffRow { stock_code: string; change_type: string; diff_weight: number | null }
    interface StockInfoRow { stock_code: string; name_short: string | null; industry: string | null }

    const allStockIds = [...new Set(typedSignals.map((s) => s.stock_id))];

    const sevenDaysAgo = new Date(headerDate);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    const [{ data: holdingRows }, { data: diffRows }, { data: stockInfoRows }] = await Promise.all([
        supabase
            .from('etf_holdings_snapshot')
            .select('stock_code, etf_code, stock_name')
            .in('etf_code', ETF_CODES)
            .in('stock_code', allStockIds),
        supabase
            .from('etf_diff_logs')
            .select('stock_code, change_type, diff_weight')
            .eq('etf_code', PORTFOLIO_ETF)
            .gte('data_date', sevenDaysAgoStr)
            .lte('data_date', headerDate)
            .in('stock_code', allStockIds),
        supabase
            .from('stock_basic_info')
            .select('stock_code, name_short, industry')
            .in('stock_code', allStockIds),
    ]);

    const typedHoldings = (holdingRows ?? []) as HoldingRow[];
    const typedDiffRows = (diffRows ?? []) as DiffRow[];
    const typedStockInfoRows = (stockInfoRows ?? []) as StockInfoRow[];

    const holdingsSet = new Set<string>(
        typedHoldings.filter((h) => h.etf_code === PORTFOLIO_ETF).map((h) => h.stock_code),
    );

    const etfHoldersMap = new Map<string, string[]>();
    for (const row of typedHoldings) {
        const code = row.stock_code;
        const etfCode = row.etf_code;
        if (!etfHoldersMap.has(code)) etfHoldersMap.set(code, []);
        etfHoldersMap.get(code)!.push(etfCode);
    }

    const diffEvents: DiffEvent[] = typedDiffRows.map((r) => ({
        stock_id: r.stock_code,
        change_type: r.change_type,
        diff_weight: r.diff_weight ?? 0,
    }));

    const stockInfoMap = new Map<string, { name: string | null; industry: string | null }>();
    for (const row of typedStockInfoRows) {
        stockInfoMap.set(row.stock_code, {
            name: row.name_short ?? null,
            industry: row.industry ?? null,
        });
    }

    // 從 etf_holdings_snapshot 補充 stock_basic_info 查不到的名稱
    const snapshotNameMap = new Map<string, string>();
    for (const row of typedHoldings) {
        const code = row.stock_code;
        if (row.stock_name && !snapshotNameMap.has(code)) {
            snapshotNameMap.set(code, row.stock_name);
        }
    }
    for (const [code, snapshotName] of snapshotNameMap) {
        const existing = stockInfoMap.get(code);
        if (!existing?.name) {
            stockInfoMap.set(code, { name: snapshotName, industry: existing?.industry ?? null });
        }
    }

    const strategyMap = new Map<string, StrategyStock[]>();
    for (const sig of typedSignals) {
        const strategyId = sig.strategy_id;
        const stockId = sig.stock_id;
        const info = stockInfoMap.get(stockId) ?? { name: null, industry: null };
        if (!strategyMap.has(strategyId)) strategyMap.set(strategyId, []);
        strategyMap.get(strategyId)!.push({
            stock_id: stockId,
            score: sig.score,
            movement: computeMovement(stockId, holdingsSet, diffEvents),
            name: info.name,
            industry: info.industry,
            etfHolders: etfHoldersMap.get(stockId) ?? [],
            avg_turnover: sig.avg_turnover ?? null,
            liquidity_flag: sig.liquidity_flag ?? null,
        });
    }

    const descriptions = getStrategyDescriptions();

    const strategies: StrategyEntry[] = [...strategyMap.entries()].map(([id, stocks]) => ({
        id,
        description: descriptions[id] ?? id,
        stocks,
    }));

    return { date: headerDate, strategies };
}

export async function getStrategySignals(date?: string): Promise<StrategySignalsResult | null> {
    const cached = unstable_cache(
        () => _getStrategySignals(date),
        // v3：strategy_signals 新增 avg_turnover / liquidity_flag 欄位（strategy-liquidity-filter）。
        // 版本號用於手動失效舊欄位結構算出的快取結果。
        ['strategy-signals-v3', date ?? 'latest'],
        { revalidate: 3600 },
    );
    return cached();
}
