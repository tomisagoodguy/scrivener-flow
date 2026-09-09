import type { EtfSectorActivityMap } from '@/lib/investment/etfSectorActivityUtils';

export type SectorResonanceHeat = {
    category: string;
    heatScore: number;
    stockCount: number;
    etfCount: number;
};

// ETF breadth (how many distinct ETFs are buying) weighs more heavily than raw
// stock count: several funds converging on a sector is a stronger resonance
// signal than one fund holding many stocks in it.
const ETF_COUNT_WEIGHT = 3;
const STOCK_COUNT_WEIGHT = 1;

export function buildSectorResonanceHeat(activityMap: EtfSectorActivityMap): SectorResonanceHeat[] {
    return Object.entries(activityMap).map(([category, activity]) => {
        const etfCount = activity.etf_codes.length;
        const stockCount = activity.stock_codes.length;
        return {
            category,
            heatScore: etfCount * ETF_COUNT_WEIGHT + stockCount * STOCK_COUNT_WEIGHT,
            stockCount,
            etfCount,
        };
    });
}
