import type { FanBreakoutSignalType } from '@/lib/investment/fanBreakout';

export type MovementLabel = 'adding' | 'reducing' | 'holding' | 'none';

/**
 * strategy_signals.score 語意依 strategy_id 而異：
 *   - 'fund_momentum': 0–100 整數百分位（全市場 20日買超強度排名，越高越強）
 *   - 其他所有策略: 0/1 布林等效值
 * 讀取時必須先以 strategy_id 區分，禁止套用 score > 0.5 之類的通用過濾。
 */
export type StrategyId =
    | 'super8888'
    | 'super888'
    | 'capital_layer'
    | 'low_vol_cap'
    | 'broker_ranked'
    | 'low_vol_alpha'
    | 'fund_momentum'
    | 'trend_template'
    | 'fan_breakout';

export interface StrategyStock {
    stock_id: string;
    score: number | null;
    movement: MovementLabel;
    name?: string | null;
    industry?: string | null;
    etfHolders?: string[];
    avg_turnover: number | null;
    liquidity_flag: boolean | null;
}

export interface StrategyEntry {
    id: string;
    description: string;
    /** 該策略採用的訊號日期（YYYY-MM-DD）；未指定日期時為該策略自身最新日期 */
    date: string;
    stocks: StrategyStock[];
}

export interface StrategySignalsResult {
    date: string;
    strategies: StrategyEntry[];
}

export interface DiffEvent {
    stock_id: string;
    change_type: string;
    diff_weight: number;
}

/** Derive 00981A movement label for one stock. */
export function computeMovement(
    stockId: string,
    holdings: Set<string>,
    diffEvents: DiffEvent[],
): MovementLabel {
    const events = diffEvents.filter((e) => e.stock_id === stockId);

    if (events.length > 0) {
        const hasAdding = events.some(
            (e) => (e.change_type === 'BUY' || e.change_type === 'IN') && e.diff_weight > 0,
        );
        if (hasAdding) return 'adding';

        const hasReducing = events.some(
            (e) => (e.change_type === 'SELL' || e.change_type === 'OUT') && e.diff_weight < 0,
        );
        if (hasReducing) return 'reducing';
    }

    if (holdings.has(stockId)) return 'holding';
    return 'none';
}

/**
 * 策略圖表頁篩選條件。
 * strategy 的 'all' 為保留值（代表不篩選），其他字串為 strategy id；
 * 型別 'all' | string 會被 TS 收斂為 string，僅作語意標示。
 */
export interface ChartStockFilters {
    strategy: 'all' | string;
    fanSignal: 'all' | FanBreakoutSignalType;
}

export const DEFAULT_CHART_STOCK_FILTERS: ChartStockFilters = { strategy: 'all', fanSignal: 'all' };

/**
 * 依策略與均線發散訊號型態篩選（兩條件 AND，保留原順序，不改動輸入）。
 * fanSignal 非 'all' 時，不在 fanSignalTypes 內或值為 null 的股票一律排除。
 */
export function filterChartStocks<T extends { stock_id: string; strategies: string[] }>(
    stocks: T[],
    filters: ChartStockFilters,
    fanSignalTypes: Record<string, FanBreakoutSignalType | null>,
): T[] {
    const { strategy, fanSignal } = filters;
    return stocks.filter((stock) => {
        if (strategy !== 'all' && !stock.strategies.includes(strategy)) return false;
        if (fanSignal !== 'all' && fanSignalTypes[stock.stock_id] !== fanSignal) return false;
        return true;
    });
}

/** 每個策略 id 出現在幾支股票（同一股票重複列同一策略只算一次）。 */
export function countStocksByStrategy(stocks: { strategies: string[] }[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const stock of stocks) {
        for (const id of new Set(stock.strategies)) {
            counts[id] = (counts[id] ?? 0) + 1;
        }
    }
    return counts;
}
