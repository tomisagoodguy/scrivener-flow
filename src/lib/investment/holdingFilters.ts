import { Holding } from '@/types/investment';

export type SortField =
    | 'weight'
    | 'shares'
    | 'amount'
    | 'margin_ratio'
    | 'change_percent'
    | 'volatility'
    | 'market_cap'
    | 'monthly_revenue'
    | 'revenue_yoy'
    | 'revenue_mom'
    | 'revenue_momentum_rank'
    | 'filter_score'
    | 'momentum_60d'
    | 'it_buy_5d'
    | 'price';

export type SortOrder = 'asc' | 'desc';

// 台股代號：4-6 位數字，選擇性尾綴 1 個英文字母（如 2330、00981A）。
// 美股/海外標的代號含多個英文字母（如 NVDA、TSLA US），藉此排除以避免上一檔/下一檔導航中斷。
const TW_STOCK_CODE_RE = /^\d{4,6}[A-Z]?$/;

export function isTaiwanStockCode(code: string): boolean {
    return TW_STOCK_CODE_RE.test(code);
}

interface FilterDefinition {
    id: string;
    label: string;
    filter: (h: Holding) => boolean;
}

export const FILTER_DEFINITIONS: FilterDefinition[] = [
    { id: 'high', label: '創新高', filter: (d) => !!d.is_high_5d },
    { id: 'weight', label: '權重前10', filter: (d) => (d.weightRank ?? Infinity) <= 10 },
    { id: 'amount', label: '成交前10', filter: (d) => (d.amountRank ?? Infinity) <= 10 },
    { id: 'yoy', label: 'YoY >20%', filter: (d) => (d.revenue_yoy || 0) > 20 },
    { id: 'momentum', label: 'PR > 80', filter: (d) => (d.revenue_momentum_rank || 0) > 0.8 },
    { id: 'low_vol', label: '低波動 <8%', filter: (d) => (d.volatility || 0) > 0 && (d.volatility || 0) < 8 },
    { id: 'high_margin', label: '高資前10', filter: (d) => (d.marginRankHigh ?? Infinity) <= 10 },
    { id: 'low_margin', label: '低資前10', filter: (d) => (d.marginRankLow ?? Infinity) <= 10 },
    { id: 'golden_zone', label: '黃金區間', filter: (d) => (d.revenue_yoy || 0) >= 50 && (d.revenue_yoy || 0) <= 100 },
    { id: 'explosive_zone', label: '爆發區間', filter: (d) => (d.revenue_yoy || 0) > 100 },
    // === 量化 Filter ===
    { id: 'triple_pass', label: '🏆 三大全過', filter: (d) => (d.filter_score ?? 0) === 3 },
    { id: 'double_pass', label: '⚡ 雙Filter', filter: (d) => (d.filter_score ?? 0) >= 2 },
    { id: 'rev_new_high', label: '⭐ Rev新高', filter: (d) => !!d.rev_ma3_new_high },
];

export function getRankedHoldings(holdings: Holding[]): Holding[] {
    if (!holdings.length) return [];

    // Create a base map for O(1) lookups during rank assignment
    // We clone objects to avoid mutating original state if needed, 
    // but shallow copy is enough for adding properties.
    const result_map = new Map(holdings.map(h => [h.stock_code, { ...h }]));

    // Helper to assign ranks
    const assignRank = (
        comparator: (a: Holding, b: Holding) => number,
        rankKey: keyof Pick<Holding, 'weightRank' | 'amountRank' | 'marginRankHigh' | 'marginRankLow'>
    ) => {
        // Sort a lightweight array of references
        const sorted = [...holdings].sort(comparator);
        sorted.forEach((h, index) => {
            const item = result_map.get(h.stock_code);
            if (item) {
                item[rankKey] = index + 1;
            }
        });
    };

    // 1. Weight Rank (Desc)
    assignRank((a, b) => (b.weight || 0) - (a.weight || 0), 'weightRank');

    // 2. Amount Rank (Desc)
    assignRank((a, b) => (b.amount || 0) - (a.amount || 0), 'amountRank');

    // 3. Margin Rank High (Desc)
    assignRank((a, b) => (b.margin_ratio || 0) - (a.margin_ratio || 0), 'marginRankHigh');

    // 4. Margin Rank Low (Asc)
    assignRank((a, b) => (a.margin_ratio || 0) - (b.margin_ratio || 0), 'marginRankLow');

    return Array.from(result_map.values());
}

export function filterAndSortHoldings(
    holdings: Holding[],
    filters: string[],
    searchTerm: string,
    sortField: SortField = 'weight',
    sortOrder: SortOrder = 'desc'
): Holding[] {
    let result = getRankedHoldings(holdings);

    // Filter
    if (filters.length > 0) {
        const activeDefinitions = filters
            .map(fid => FILTER_DEFINITIONS.find(d => d.id === fid))
            .filter((d): d is FilterDefinition => !!d);
            
        if (activeDefinitions.length > 0) {
            result = result.filter(h => activeDefinitions.every(def => def.filter(h)));
        }
    }

    // Search
    if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();
        result = result.filter(d => 
            d.stock_name.toLowerCase().includes(lowerTerm) || 
            d.stock_code.includes(lowerTerm)
        );
    }

    // Sort
    return result.sort((a, b) => {
        // Safe access with keyof Holding, though SortField is a subset
        const valA = (a[sortField] as number) ?? -Infinity;
        const valB = (b[sortField] as number) ?? -Infinity;
        
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });
}
