
import { fetchRevenueData } from '@/repositories/revenueRepo';
import { fetchPriceData } from '@/repositories/priceRepo';
import { fetchStockNames } from '@/repositories/stockRepo';
import { calculateWinRateBuckets } from './calculators/winRateCalculator';
import { calculateHeatmapCells } from './calculators/heatmapCalculator';
import type { WinRateYearData, HeatmapYearData } from '@/types/revenuelab';

// ── 模組 A：勝率回測 ──────────────────────────────────────

export async function fetchWinRateFromDB(
  year: number,
  low = 50,
  high = 100
): Promise<WinRateYearData | null> {
  try {
    console.log(`[WinRate] Fetching data for year ${year}, yoy [${low}, ${high})...`);

    // 1. Fetch Data in Parallel
    const [revenueRows, priceData] = await Promise.all([
      fetchRevenueData(year, { yoyLow: low, yoyHigh: high }),
      fetchPriceData(year)
    ]);

    if (!revenueRows.length) {
      console.warn('[WinRate] No revenue data found.');
      return null;
    }
    
    if (!priceData.startPrices.length || !priceData.endPrices.length) {
      console.warn('[WinRate] No price data found.');
      return null;
    }

    // 2. Fetch Stock Names (only for stocks present in revenue data)
    const stockCodes = [...new Set(revenueRows.map(r => r.stock_code))];
    const nameMap = await fetchStockNames(stockCodes);

    // 3. Perform Calculation
    return calculateWinRateBuckets(
      revenueRows,
      priceData.startPrices,
      priceData.endPrices,
      nameMap,
      { year, low, high }
    );

  } catch (error) {
    console.error('[WinRate] Error in fetchWinRateFromDB:', error);
    return null;
  }
}

// ── 模組 B：熱力圖 ────────────────────────────────────────

export async function fetchHeatmapFromDB(year: number): Promise<HeatmapYearData | null> {
  try {
    console.log(`[Heatmap] Fetching data for year ${year}...`);

    // 1. Fetch Data (Heatmap needs all revenue data, not filtered by YOY range)
    // Note: The original code filtered specifically for not-null revenue_yoy
    const [revenueRows, priceData] = await Promise.all([
      fetchRevenueData(year), 
      fetchPriceData(year)
    ]);

    if (!revenueRows.length) {
      console.warn('[Heatmap] No revenue data found.');
      return null;
    }

    if (!priceData.startPrices.length || !priceData.endPrices.length) {
      console.warn('[Heatmap] No price data found.');
      return null;
    }

    // 2. Perform Calculation
    return calculateHeatmapCells(
      year,
      revenueRows,
      priceData.startPrices,
      priceData.endPrices
    );

  } catch (error) {
    console.error('[Heatmap] Error in fetchHeatmapFromDB:', error);
    return null;
  }
}
