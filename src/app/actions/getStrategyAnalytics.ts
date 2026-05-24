'use server';

import { unstable_cache } from 'next/cache';
import { getSectorStrength } from './getSectorStrength';
import { getPublicClient } from '@/lib/supabase/service';
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

async function getStrategySignalStocksEnriched(): Promise<SectorStock[]> {
    const supabase = getPublicClient();

    // strategy_signals 最新日期的精選股
    const { data: latestSig } = await supabase
        .from('strategy_signals')
        .select('date')
        .order('date', { ascending: false })
        .limit(1)
        .single();
    if (!latestSig) return [];
    const sigDate = (latestSig as { date: string }).date;

    const { data: signals } = await supabase
        .from('strategy_signals')
        .select('stock_id')
        .eq('date', sigDate)
        .eq('is_selected', true);
    if (!signals || signals.length === 0) return [];
    const stockIds = [...new Set((signals as { stock_id: string }[]).map(s => s.stock_id))];

    // sector_strength_stocks 最新日期補充漲跌幅、族群、成交量
    const { data: latestSector } = await supabase
        .from('sector_strength_stocks')
        .select('date')
        .order('date', { ascending: false })
        .limit(1)
        .single();
    const sectorDate = latestSector ? (latestSector as { date: string }).date : null;

    const enrichMap = new Map<string, SectorStock>();
    if (sectorDate) {
        const { data: sectorRows } = await supabase
            .from('sector_strength_stocks')
            .select('stock_id, stock_name, ret_1d, ret_5d, ret_20d, momentum_score, amount, category')
            .eq('date', sectorDate)
            .in('stock_id', stockIds);
        for (const row of (sectorRows ?? []) as SectorStock[]) {
            enrichMap.set(row.stock_id, { ...row, is_strategy_hit: true });
        }
    }

    // 找不到族群資料的股票補 stock_basic_info
    const missing = stockIds.filter(id => !enrichMap.has(id));
    if (missing.length > 0) {
        const { data: basicRows } = await supabase
            .from('stock_basic_info')
            .select('stock_code, name_short, industry')
            .in('stock_code', missing);
        for (const row of (basicRows ?? []) as { stock_code: string; name_short: string | null; industry: string | null }[]) {
            enrichMap.set(row.stock_code, {
                stock_id: row.stock_code,
                stock_name: row.name_short ?? null,
                ret_1d: null, ret_5d: null, ret_20d: null,
                is_strategy_hit: true,
                momentum_score: null,
                amount: null,
                category: row.industry ?? '其他',
            });
        }
    }

    return stockIds.map(id => enrichMap.get(id) ?? {
        stock_id: id,
        stock_name: null,
        ret_1d: null, ret_5d: null, ret_20d: null,
        is_strategy_hit: true,
        momentum_score: null,
        amount: null,
        category: '其他',
    });
}

async function _getStrategyAnalytics(): Promise<StrategyAnalyticsData> {
    const sectorData = await getSectorStrength();
    const date = sectorData.date;

    const stocks = await getStrategySignalStocksEnriched();

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
        ['strategy-analytics-v2'],
        { revalidate: 3600 },
    );
    return cached();
}
