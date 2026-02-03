import { Holding } from '@/types/investment';

export type SortField = 'weight' | 'shares' | 'amount' | 'margin_ratio' | 'change_percent' | 'volatility' | 'market_cap' | 'monthly_revenue' | 'revenue_yoy' | 'revenue_mom' | 'revenue_momentum_rank' | 'price';
export type SortOrder = 'asc' | 'desc';

export const FILTER_DEFINITIONS = [
    { id: 'high', label: '創新高', filter: (d: Holding) => !!d.is_high_5d },
    { id: 'weight', label: '權重前10', filter: (d: Holding, ranks: any) => ranks.weightRank <= 10 },
    { id: 'amount', label: '成交前10', filter: (d: Holding, ranks: any) => ranks.amountRank <= 10 },
    { id: 'yoy', label: 'YoY >20%', filter: (d: Holding) => (d.revenue_yoy || 0) > 20 },
    { id: 'momentum', label: 'PR > 80', filter: (d: Holding) => (d.revenue_momentum_rank || 0) > 0.8 },
    { id: 'low_vol', label: '低波動 <8%', filter: (d: Holding) => (d.volatility || 0) > 0 && (d.volatility || 0) < 8 },
    { id: 'high_margin', label: '高資前10', filter: (d: Holding, ranks: any) => ranks.marginRankHigh <= 10 },
    { id: 'low_margin', label: '低資前10', filter: (d: Holding, ranks: any) => ranks.marginRankLow <= 10 },
];

export function getRankedHoldings(holdings: Holding[]) {
    // Calculate ranks once
    const sortedByWeight = [...holdings].sort((a, b) => (b.weight || 0) - (a.weight || 0));
    const sortedByAmount = [...holdings].sort((a, b) => (b.amount || 0) - (a.amount || 0));
    const sortedByMarginDesc = [...holdings].sort((a, b) => (b.margin_ratio || 0) - (a.margin_ratio || 0));
    const sortedByMarginAsc = [...holdings].sort((a, b) => (a.margin_ratio || 0) - (b.margin_ratio || 0));

    const rankMap = new Map<string, any>();

    holdings.forEach(h => {
        rankMap.set(h.stock_code, {
            weightRank: sortedByWeight.findIndex(x => x.stock_code === h.stock_code) + 1,
            amountRank: sortedByAmount.findIndex(x => x.stock_code === h.stock_code) + 1,
            marginRankHigh: sortedByMarginDesc.findIndex(x => x.stock_code === h.stock_code) + 1,
            marginRankLow: sortedByMarginAsc.findIndex(x => x.stock_code === h.stock_code) + 1,
        });
    });

    return holdings.map(h => ({
        ...h,
        ...rankMap.get(h.stock_code)
    }));
}

export function filterAndSortHoldings(
    holdings: Holding[],
    filters: string[],
    searchTerm: string,
    sortField: SortField = 'weight',
    sortOrder: SortOrder = 'desc'
) {
    let result = getRankedHoldings(holdings);

    // Filter
    if (filters.length > 0) {
        filters.forEach(fid => {
            const def = FILTER_DEFINITIONS.find(d => d.id === fid);
            if (def) {
                result = result.filter(d => def.filter(d, d)); // Pass d as both holding and ranks since we merged them
            }
        });
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
        const valA = (a as any)[sortField] ?? -Infinity;
        const valB = (b as any)[sortField] ?? -Infinity;
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });
}
