export const OVERLAP_COLORS: Record<number, { bg: string; dark: string; badge: string; badgeDark: string; dot: string }> = {
    2: { bg: 'bg-blue-50/80',   dark: 'dark:bg-blue-900/30',   badge: 'bg-blue-100 text-blue-800',     badgeDark: 'dark:bg-blue-900/50 dark:text-blue-300',   dot: 'bg-blue-400' },
    3: { bg: 'bg-green-50/80',  dark: 'dark:bg-green-900/30',  badge: 'bg-green-100 text-green-800',   badgeDark: 'dark:bg-green-900/50 dark:text-green-300', dot: 'bg-green-400' },
    4: { bg: 'bg-orange-50/80', dark: 'dark:bg-orange-900/30', badge: 'bg-orange-100 text-orange-800', badgeDark: 'dark:bg-orange-900/50 dark:text-orange-300', dot: 'bg-orange-400' },
};

export const TOP_COLOR = {
    bg: 'bg-yellow-50/80', dark: 'dark:bg-yellow-900/30',
    badge: 'bg-yellow-100 text-yellow-800', badgeDark: 'dark:bg-yellow-900/50 dark:text-yellow-300',
    dot: 'bg-yellow-400',
};

export function getOverlapColor(count: number, max: number) {
    if (count === max) return TOP_COLOR;
    return OVERLAP_COLORS[count] ?? OVERLAP_COLORS[2];
}

export function truncateList(list: string[], max: number): { shown: string[]; remaining: number } {
    if (list.length <= max) return { shown: list, remaining: 0 };
    return { shown: list.slice(0, max), remaining: list.length - max };
}

// ── 個股分組重疊資料（表格視圖用）───────────────────────────────────────────

import type { EtfData } from './EtfComparePanel';

export interface StockOverlapRow {
    stock_code: string;
    stock_name: string;
    held_by: string[];
    held_count: number;
    coverage_pct: number;
    avg_weight: number;
    total_weight: number;
}

export function buildStockOverlapRows(etfs: EtfData[], totalEtfs: number): StockOverlapRow[] {
    const map = new Map<string, { stock_name: string; held_by: string[]; weights: number[] }>();
    for (const etf of etfs) {
        for (const h of etf.holdings) {
            let entry = map.get(h.stock_code);
            if (!entry) {
                entry = { stock_name: h.stock_name, held_by: [], weights: [] };
                map.set(h.stock_code, entry);
            }
            entry.held_by.push(etf.etf_code);
            entry.weights.push(h.weight);
        }
    }

    const rows: StockOverlapRow[] = [];
    for (const [stock_code, entry] of map) {
        const held_count = entry.held_by.length;
        const total_weight = entry.weights.reduce((sum, w) => sum + w, 0);
        rows.push({
            stock_code,
            stock_name: entry.stock_name,
            held_by: [...entry.held_by].sort(),
            held_count,
            coverage_pct: totalEtfs > 0 ? (held_count / totalEtfs) * 100 : 0,
            avg_weight: held_count > 0 ? total_weight / held_count : 0,
            total_weight,
        });
    }
    return rows;
}

export type StockOverlapSortField = 'held_count' | 'coverage_pct' | 'avg_weight' | 'total_weight';

export function sortStockOverlapRows(
    rows: StockOverlapRow[],
    field: StockOverlapSortField,
    direction: 'asc' | 'desc'
): StockOverlapRow[] {
    const sorted = [...rows].sort((a, b) => a[field] - b[field]);
    return direction === 'desc' ? sorted.reverse() : sorted;
}
