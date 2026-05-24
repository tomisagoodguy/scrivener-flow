export type MovementLabel = 'adding' | 'reducing' | 'holding' | 'none';

/**
 * strategy_signals.score 語意依 strategy_id 而異：
 *   - 'fund_momentum': 0–100 整數百分位（全市場 20日買超強度排名，越高越強）
 *   - 其他所有策略: 0/1 布林等效值
 * 讀取時必須先以 strategy_id 區分，禁止套用 score > 0.5 之類的通用過濾。
 */
export type StrategyId =
    | 'super8888'
    | 'capital_layer'
    | 'low_vol_cap'
    | 'broker_ranked'
    | 'low_vol_alpha'
    | 'fund_momentum';

export interface StrategyStock {
    stock_id: string;
    score: number | null;
    movement: MovementLabel;
    name?: string | null;
    industry?: string | null;
    etfHolders?: string[];
}

export interface StrategyEntry {
    id: string;
    description: string;
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
