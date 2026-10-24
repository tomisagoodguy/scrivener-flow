import type { StrategySignalsResult } from '@/lib/investment/strategyUtils';
import type { MovementLabel } from '@/lib/investment/strategyUtils';
import { getStrategyDescriptions } from '@/app/actions/strategyRegistry';

export interface ConsensusStrategyRef {
    id: string;
    label: string;
}

export interface MultiConsensusEntry {
    stock_id: string;
    name: string | null | undefined;
    count: number;
    industry: string | null | undefined;
    strategies: ConsensusStrategyRef[];
    /** 僅最新模式提供 */
    etfHolders?: string[];
    /** 僅最新模式提供 */
    movement?: MovementLabel;
    /** 僅近 N 天模式提供：任一策略最後選中日期 */
    lastDate?: string;
}

export type ConsensusMinCount = 2 | 3 | 4;
export type ConsensusView = 'list' | 'matrix';
export type ConsensusWindow = 'latest' | 7 | 14 | 30;

export interface ConsensusParams {
    minCount: ConsensusMinCount;
    view: ConsensusView;
    window: ConsensusWindow;
}

export const CONSENSUS_MIN_COUNTS: readonly ConsensusMinCount[] = [2, 3, 4];
export const CONSENSUS_WINDOW_DAYS: readonly Exclude<ConsensusWindow, 'latest'>[] = [7, 14, 30];

/** 解析 cmin / cview / cwin search params，非法值回退預設（2 / list / latest）。 */
export function parseConsensusParams(sp: { cmin?: string; cview?: string; cwin?: string }): ConsensusParams {
    const minCount = CONSENSUS_MIN_COUNTS.find((n) => String(n) === sp.cmin) ?? 2;
    const view: ConsensusView = sp.cview === 'matrix' ? 'matrix' : 'list';
    const window = CONSENSUS_WINDOW_DAYS.find((n) => String(n) === sp.cwin) ?? 'latest';
    return { minCount, view, window };
}

function toStrategyRefs(ids: Iterable<string>): ConsensusStrategyRef[] {
    const descriptions = getStrategyDescriptions();
    return [...ids].sort().map((id) => ({ id, label: descriptions[id] ?? id }));
}

function sortEntries(entries: MultiConsensusEntry[]): MultiConsensusEntry[] {
    return entries.sort((a, b) =>
        b.count !== a.count ? b.count - a.count : a.stock_id.localeCompare(b.stock_id),
    );
}

export function buildMultiConsensusStocks(
    result: StrategySignalsResult | null,
    minCount: number = 2,
): MultiConsensusEntry[] {
    if (!result) return [];

    const stockMap = new Map<string, { ids: Set<string>; data: MultiConsensusEntry }>();

    for (const strategy of result.strategies) {
        for (const stock of strategy.stocks) {
            const existing = stockMap.get(stock.stock_id);
            if (existing) {
                existing.ids.add(strategy.id);
            } else {
                stockMap.set(stock.stock_id, {
                    ids: new Set([strategy.id]),
                    data: {
                        stock_id: stock.stock_id,
                        name: stock.name,
                        count: 1,
                        industry: stock.industry,
                        strategies: [],
                        etfHolders: stock.etfHolders ?? [],
                        movement: stock.movement,
                    },
                });
            }
        }
    }

    const entries: MultiConsensusEntry[] = [];
    for (const { ids, data } of stockMap.values()) {
        if (ids.size >= minCount) {
            entries.push({ ...data, count: ids.size, strategies: toStrategyRefs(ids) });
        }
    }

    return sortEntries(entries);
}

export interface ConsensusHistoryRow {
    strategy_id: string;
    stock_id: string;
    date: string;
}

export interface ConsensusStockInfoRow {
    stock_code: string;
    name_short: string | null;
    industry: string | null;
}

/** 近 N 天模式：依視窗內「不同策略數」聚合（同策略多日只算一次）。 */
export function buildConsensusHistory(
    rows: ConsensusHistoryRow[],
    stockInfo: ConsensusStockInfoRow[],
    minCount: number,
): MultiConsensusEntry[] {
    const infoMap = new Map(stockInfo.map((r) => [r.stock_code, r]));
    const stockMap = new Map<string, { ids: Set<string>; lastDate: string }>();

    for (const row of rows) {
        const existing = stockMap.get(row.stock_id);
        if (existing) {
            existing.ids.add(row.strategy_id);
            if (row.date > existing.lastDate) existing.lastDate = row.date;
        } else {
            stockMap.set(row.stock_id, { ids: new Set([row.strategy_id]), lastDate: row.date });
        }
    }

    const entries: MultiConsensusEntry[] = [];
    for (const [stockId, { ids, lastDate }] of stockMap) {
        if (ids.size < minCount) continue;
        const info = infoMap.get(stockId);
        entries.push({
            stock_id: stockId,
            name: info?.name_short ?? null,
            industry: info?.industry ?? null,
            count: ids.size,
            strategies: toStrategyRefs(ids),
            lastDate,
        });
    }

    return sortEntries(entries);
}

export interface ConsensusMatrixColumn extends ConsensusStrategyRef {
    date?: string;
}

export interface ConsensusMatrix {
    columns: ConsensusMatrixColumn[];
    rows: { entry: MultiConsensusEntry; cells: boolean[] }[];
}

/** 股票 × 策略矩陣：欄依選中列數降冪、id 升冪；strategyDates 僅最新模式提供。 */
export function buildConsensusMatrix(
    entries: MultiConsensusEntry[],
    strategyDates: Record<string, string> = {},
): ConsensusMatrix {
    const columnMap = new Map<string, { ref: ConsensusStrategyRef; hits: number }>();
    for (const entry of entries) {
        for (const ref of entry.strategies) {
            const col = columnMap.get(ref.id);
            if (col) col.hits += 1;
            else columnMap.set(ref.id, { ref, hits: 1 });
        }
    }

    const columns: ConsensusMatrixColumn[] = [...columnMap.values()]
        .sort((a, b) => (b.hits !== a.hits ? b.hits - a.hits : a.ref.id.localeCompare(b.ref.id)))
        .map(({ ref }) => (strategyDates[ref.id] ? { ...ref, date: strategyDates[ref.id] } : { ...ref }));

    const rows = entries.map((entry) => {
        const selected = new Set(entry.strategies.map((s) => s.id));
        return { entry, cells: columns.map((c) => selected.has(c.id)) };
    });

    return { columns, rows };
}

/** 'YYYY-MM-DD' → 'MM/DD' */
export function formatMonthDay(date: string): string {
    return date.slice(5).replace('-', '/');
}

const STRATEGY_LABEL_MAX = 8;

/** 策略名稱截至 8 字（超過加 …），完整名稱由呼叫端放 title */
export function shortStrategyLabel(label: string): string {
    return label.length > STRATEGY_LABEL_MAX ? `${label.slice(0, STRATEGY_LABEL_MAX).trimEnd()} …` : label;
}
