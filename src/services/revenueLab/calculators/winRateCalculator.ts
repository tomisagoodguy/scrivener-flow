
import type { WinRateYearData, WinRateBucket, StockDetail } from '@/types/revenuelab';
import type { RevenueRow } from '@/repositories/revenueRepo';
import type { PriceRow } from '@/repositories/priceRepo';

interface WinRateConfig {
  year: number;
  low: number;
  high: number;
}

export function calculateWinRateBuckets(
  revenueData: RevenueRow[],
  startPrices: PriceRow[],
  endPrices: PriceRow[],
  nameMap: Map<string, string>,
  config: WinRateConfig
): WinRateYearData | null {
  
  // 1. 各股票爆發次數（YOY 在 [low, high) 的月份數）
  const hitMap = new Map<string, number>();
  const yoySumMap = new Map<string, number>();
  const yoyCountMap = new Map<string, number>();

  for (const row of revenueData) {
    hitMap.set(row.stock_code, (hitMap.get(row.stock_code) ?? 0) + 1);
    
    // 累積 YOY 用於計算平均
    yoySumMap.set(row.stock_code, (yoySumMap.get(row.stock_code) ?? 0) + row.revenue_yoy);
    yoyCountMap.set(row.stock_code, (yoyCountMap.get(row.stock_code) ?? 0) + 1);
  }

  if (hitMap.size === 0) return null;

  // 2. 取各股票最早開盤價和最晚收盤價
  const openMap = new Map<string, number>();
  for (const row of startPrices) {
    if (!openMap.has(row.stock_code)) openMap.set(row.stock_code, row.open);
  }
  const closeMap = new Map<string, number>();
  for (const row of endPrices) {
    if (!closeMap.has(row.stock_code)) closeMap.set(row.stock_code, row.close);
  }

  // 3. 計算漲幅並按爆發次數分組
  const bucketMap = new Map<number, number[]>();
  const stockDetailMap = new Map<number, Array<{ code: string; ret: number }>>();

  for (const [stockCode, hits] of hitMap) {
    const open = openMap.get(stockCode);
    const close = closeMap.get(stockCode);
    
    // 必須要有對應的股價資料才納入統計
    if (open && close && open > 0) {
      const ret = ((close - open) / open) * 100;
      
      if (!bucketMap.has(hits)) bucketMap.set(hits, []);
      bucketMap.get(hits)!.push(ret);
      
      if (!stockDetailMap.has(hits)) stockDetailMap.set(hits, []);
      stockDetailMap.get(hits)!.push({ code: stockCode, ret });
    }
  }

  if (bucketMap.size === 0) return null;

  // 4. 計算統計量並填入 buckets
  const buckets: WinRateBucket[] = [];
  for (const [hits, returns] of bucketMap) {
    const sorted = [...returns].sort((a, b) => a - b);
    const avg = returns.reduce((s, v) => s + v, 0) / returns.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    
    const winCount = returns.filter((r) => r > 20).length;
    const winRate = (winCount / returns.length) * 100;
    
    const doubleCount = returns.filter((r) => r > 100).length;
    const doubleRate = (doubleCount / returns.length) * 100;
    
    const variance = returns.reduce((s, v) => s + (v - avg) ** 2, 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    // 建立股票明細 details
    const details: StockDetail[] = (stockDetailMap.get(hits) ?? [])
      .sort((a, b) => b.ret - a.ret)
      .slice(0, 50)
      .map(({ code, ret }) => {
        const yoySum = yoySumMap.get(code) ?? 0;
        const yoyCount = yoyCountMap.get(code) ?? 1;
        return {
          code,
          name: nameMap.get(code) ?? code,
          annualReturn: Math.round(ret * 10) / 10,
          burstMonths: hits,
          avgYoy: Math.round((yoySum / yoyCount) * 10) / 10,
        };
      });

    buckets.push({
      burstCount: hits,
      stockCount: returns.length,
      avgReturn: Math.round(avg * 10) / 10,
      medianReturn: Math.round(median * 10) / 10,
      winRate: Math.round(winRate * 10) / 10,
      doubleRate: Math.round(doubleRate * 10) / 10,
      stdDev: Math.round(stdDev * 10) / 10,
      minReturn: Math.round(sorted[0] * 10) / 10,
      maxReturn: Math.round(sorted[sorted.length - 1] * 10) / 10,
      stocks: details,
    });
  }

  buckets.sort((a, b) => b.burstCount - a.burstCount);

  return {
    year: config.year,
    metric: 'yoy_pct',
    threshold: { low: config.low, high: config.high },
    generatedAt: new Date().toISOString(),
    data: buckets,
  };
}
