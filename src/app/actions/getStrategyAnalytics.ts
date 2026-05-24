'use server';

import { unstable_cache } from 'next/cache';
import { getAllStrategyHitStocks, getSectorStrength } from './getSectorStrength';
import type { SectorStock } from './getSectorStrength';

export interface StrategySectorRow {
    category: string;
    weightedRet1d: number | null;
    weightedRet5d: number | null;
    weightedRet20d: number | null;
    stockCount: number;
    totalAmount: number | null;
}

export interface StrategyAnalyticsData {
    date: string;
    stocks: SectorStock[];
    sectorRanking: StrategySectorRow[];
}

function weightedAvg(
    stocks: SectorStock[],
    retKey: 'ret_1d' | 'ret_5d' | 'ret_20d',
): number | null {
    let totalWeight = 0;
    let totalVal = 0;
    let hasAny = false;

    for (const s of stocks) {
        const ret = s[retKey];
        if (ret === null) continue;
        hasAny = true;
        const w = s.amount ?? 1;
        totalWeight += w;
        totalVal += ret * w;
    }
    if (!hasAny) return null;
    if (totalWeight === 0) {
        const vals = stocks.map((s) => s[retKey]).filter((v): v is number => v !== null);
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    }
    return totalVal / totalWeight;
}

async function _getStrategyAnalytics(): Promise<StrategyAnalyticsData> {
    const sectorData = await getSectorStrength();
    const date = sectorData.date;

    const stocks = await getAllStrategyHitStocks(date);

    // Group strategy stocks by category
    const byCategory = new Map<string, SectorStock[]>();
    for (const stock of stocks) {
        const cat = stock.category ?? '其他';
        if (!byCategory.has(cat)) byCategory.set(cat, []);
        byCategory.get(cat)!.push(stock);
    }

    // Compute weighted-average returns per sector
    const sectorRanking: StrategySectorRow[] = [];
    for (const [category, catStocks] of byCategory) {
        const totalAmount = catStocks.reduce((s, st) => s + (st.amount ?? 0), 0);
        sectorRanking.push({
            category,
            weightedRet1d: weightedAvg(catStocks, 'ret_1d'),
            weightedRet5d: weightedAvg(catStocks, 'ret_5d'),
            weightedRet20d: weightedAvg(catStocks, 'ret_20d'),
            stockCount: catStocks.length,
            totalAmount: totalAmount > 0 ? totalAmount : null,
        });
    }

    // Sort by 1d return descending
    sectorRanking.sort((a, b) => (b.weightedRet1d ?? -999) - (a.weightedRet1d ?? -999));

    return { date, stocks, sectorRanking };
}

export async function getStrategyAnalytics(): Promise<StrategyAnalyticsData> {
    const cached = unstable_cache(
        _getStrategyAnalytics,
        ['strategy-analytics'],
        { revalidate: 3600 },
    );
    return cached();
}
