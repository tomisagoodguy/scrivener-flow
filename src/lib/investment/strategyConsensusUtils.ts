import type { StrategySignalsResult } from '@/lib/investment/strategyUtils';
import type { MovementLabel } from '@/lib/investment/strategyUtils';

export interface MultiConsensusEntry {
    stock_id: string;
    name: string | null | undefined;
    count: number;
    industry: string | null | undefined;
    etfHolders: string[];
    movement: MovementLabel;
}

export function buildMultiConsensusStocks(
    result: StrategySignalsResult | null,
): MultiConsensusEntry[] {
    if (!result) return [];

    const countMap = new Map<string, { count: number; data: MultiConsensusEntry }>();

    for (const strategy of result.strategies) {
        for (const stock of strategy.stocks) {
            if (countMap.has(stock.stock_id)) {
                countMap.get(stock.stock_id)!.count += 1;
            } else {
                countMap.set(stock.stock_id, {
                    count: 1,
                    data: {
                        stock_id: stock.stock_id,
                        name: stock.name,
                        count: 1,
                        industry: stock.industry,
                        etfHolders: stock.etfHolders ?? [],
                        movement: stock.movement,
                    },
                });
            }
        }
    }

    const entries: MultiConsensusEntry[] = [];
    for (const { count, data } of countMap.values()) {
        if (count >= 2) {
            entries.push({ ...data, count });
        }
    }

    return entries.sort((a, b) =>
        b.count !== a.count ? b.count - a.count : a.stock_id.localeCompare(b.stock_id),
    );
}
