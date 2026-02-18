'use server';

import { unstable_cache } from 'next/cache';
import { readFile } from 'fs/promises';
import path from 'path';
import { getServiceClient } from '@/lib/supabase/service';
import type {
  WinRateYearData,
  WinRateBucket,
  HeatmapYearData,
  HeatmapCell,
  ReturnBin,
  GoldenZoneStats,
} from '@/types/revenuelab';

// ── 工具函數 ──────────────────────────────────────────────

function getDataPath(filename: string): string {
  return path.join(process.cwd(), 'public', 'data', 'revenue-lab', filename);
}

async function readJsonFile<T>(filename: string): Promise<T | null> {
  try {
    const raw = await readFile(getDataPath(filename), 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// ── 資料範圍說明 ──────────────────────────────────────────
// 本專案 Supabase 資料：
//   stock_revenue_monthly: 2024-03 至今，53 檔 ETF 持股
//   stock_prices_daily:    2025-06 至今，53 檔 ETF 持股
//
// 分析策略（以 2025 年為例）：
//   月營收研究期間：2024-12 至 2025-11（12 個月）
//   股價漲幅：2025-06-01 開盤 vs 2025-12-31 收盤（半年漲幅）
//
// 注意：樣本僅限 ETF 持股（53 檔），非全市場分析

// ── 模組 A：勝率回測 ──────────────────────────────────────

async function fetchWinRateFromDB(
  year: number,
  low = 50,
  high = 100
): Promise<WinRateYearData | null> {
  const supabase = getServiceClient();

  // 月營收研究期間：前一年12月 至 目標年11月
  const revenueStart = `${year - 1}-12-01`;
  const revenueEnd = `${year}-11-30`;

  // 股價期間：目標年6月（最早有資料）至 12月底
  const priceStart = `${year}-06-01`;
  const priceEnd = `${year}-12-31`;

  // Step 1: 各股票爆發次數（YOY 在 [low, high) 的月份數）
  const { data: hitData, error: hitError } = await (supabase as any)
    .from('stock_revenue_monthly')
    .select('stock_code, revenue_yoy')
    .gte('data_date', revenueStart)
    .lte('data_date', revenueEnd)
    .gte('revenue_yoy', low)
    .lt('revenue_yoy', high) as { data: any[] | null; error: any };

  if (hitError || !hitData?.length) {
    console.error('[WinRate] 月營收查詢失敗:', hitError?.message);
    return null;
  }

  // 計算各股票爆發次數
  const hitMap = new Map<string, number>();
  for (const row of hitData) {
    hitMap.set(row.stock_code, (hitMap.get(row.stock_code) ?? 0) + 1);
  }

  // Step 2: 各股票年度（半年）漲幅
  const stockIds = [...hitMap.keys()];

  const { data: priceStartData, error: psError } = await (supabase as any)
    .from('stock_prices_daily')
    .select('stock_code, open')
    .gte('data_date', priceStart)
    .in('stock_code', stockIds)
    .order('data_date', { ascending: true }) as { data: any[] | null; error: any };

  const { data: priceEndData, error: peError } = await (supabase as any)
    .from('stock_prices_daily')
    .select('stock_code, close')
    .lte('data_date', priceEnd)
    .in('stock_code', stockIds)
    .order('data_date', { ascending: false }) as { data: any[] | null; error: any };

  if (psError || peError || !priceStartData?.length || !priceEndData?.length) {
    console.error('[WinRate] 股價查詢失敗:', psError?.message, peError?.message);
    return null;
  }

  // 取各股票最早開盤價和最晚收盤價
  const openMap = new Map<string, number>();
  for (const row of priceStartData) {
    if (!openMap.has(row.stock_code)) openMap.set(row.stock_code, row.open);
  }
  const closeMap = new Map<string, number>();
  for (const row of priceEndData) {
    if (!closeMap.has(row.stock_code)) closeMap.set(row.stock_code, row.close);
  }

  // Step 3: 計算漲幅並按爆發次數分組，同時記錄每檔股票明細
  // stockDetailMap: hits -> [{ code, ret }]
  const bucketMap = new Map<number, number[]>();
  const stockDetailMap = new Map<number, Array<{ code: string; ret: number }>>();

  // 計算各股票的平均 YOY（用於 StockDetail.avgYoy）
  const yoySumMap = new Map<string, number>();
  const yoyCountMap = new Map<string, number>();
  for (const row of hitData) {
    yoySumMap.set(row.stock_code, (yoySumMap.get(row.stock_code) ?? 0) + (row.revenue_yoy as number));
    yoyCountMap.set(row.stock_code, (yoyCountMap.get(row.stock_code) ?? 0) + 1);
  }

  for (const [stockCode, hits] of hitMap) {
    const open = openMap.get(stockCode);
    const close = closeMap.get(stockCode);
    if (open && close && open > 0) {
      const ret = ((close - open) / open) * 100;
      if (!bucketMap.has(hits)) bucketMap.set(hits, []);
      bucketMap.get(hits)!.push(ret);
      if (!stockDetailMap.has(hits)) stockDetailMap.set(hits, []);
      stockDetailMap.get(hits)!.push({ code: stockCode, ret });
    }
  }

  if (bucketMap.size === 0) return null;

  // Step 4: 查詢股票名稱
  const allStockCodes = [...hitMap.keys()];
  const { data: nameData } = await (supabase as any)
    .from('stock_basic_info')
    .select('stock_code, name_short')
    .in('stock_code', allStockCodes) as { data: any[] | null; error: any };

  const nameMap = new Map<string, string>();
  for (const row of nameData ?? []) {
    nameMap.set(row.stock_code, row.name_short);
  }

  // Step 5: 計算統計量並填入 stocks 明細
  const buckets: WinRateBucket[] = [];
  for (const [hits, returns] of bucketMap) {
    const sorted = [...returns].sort((a, b) => a - b);
    const avg = returns.reduce((s, v) => s + v, 0) / returns.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const winRate = (returns.filter((r) => r > 20).length / returns.length) * 100;
    const doubleRate = (returns.filter((r) => r > 100).length / returns.length) * 100;
    const variance = returns.reduce((s, v) => s + (v - avg) ** 2, 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    // 建立股票明細，按漲幅降序排列
    const details = (stockDetailMap.get(hits) ?? [])
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
    year,
    metric: 'yoy_pct',
    threshold: { low, high },
    generatedAt: new Date().toISOString(),
    data: buckets,
  };
}

// ── 模組 B：熱力圖 ────────────────────────────────────────

async function fetchHeatmapFromDB(year: number): Promise<HeatmapYearData | null> {
  const supabase = getServiceClient();

  const revenueStart = `${year - 1}-12-01`;
  const revenueEnd = `${year}-11-30`;
  const priceStart = `${year}-06-01`;
  const priceEnd = `${year}-12-31`;

  // 取得月營收資料
  const { data: revenueData, error: revError } = await (supabase as any)
    .from('stock_revenue_monthly')
    .select('stock_code, data_date, revenue_yoy')
    .gte('data_date', revenueStart)
    .lte('data_date', revenueEnd)
    .not('revenue_yoy', 'is', null) as { data: any[] | null; error: any };

  if (revError || !revenueData?.length) return null;

  // 取得股價漲幅
  const { data: priceStartData } = await (supabase as any)
    .from('stock_prices_daily')
    .select('stock_code, open')
    .gte('data_date', priceStart)
    .order('data_date', { ascending: true }) as { data: any[] | null; error: any };

  const { data: priceEndData } = await (supabase as any)
    .from('stock_prices_daily')
    .select('stock_code, close')
    .lte('data_date', priceEnd)
    .order('data_date', { ascending: false }) as { data: any[] | null; error: any };

  if (!priceStartData?.length || !priceEndData?.length) return null;

  // 建立股價漲幅 map
  const openMap = new Map<string, number>();
  for (const row of priceStartData) {
    if (!openMap.has(row.stock_code)) openMap.set(row.stock_code, row.open);
  }
  const closeMap = new Map<string, number>();
  for (const row of priceEndData) {
    if (!closeMap.has(row.stock_code)) closeMap.set(row.stock_code, row.close);
  }

  const retMap = new Map<string, number>();
  for (const [code, open] of openMap) {
    const close = closeMap.get(code);
    if (close && open > 0) {
      retMap.set(code, ((close - open) / open) * 100);
    }
  }

  // 定義漲幅 bin
  // 定義漲幅 bin (高解析度分組：下跌每10%，上漲每100%)
  const BIN_DEFS = [
    // 下跌區間
    { id: 'b00', label: '下跌 90%+', order: 0, min: -Infinity, max: -90 },
    { id: 'b01', label: '下跌 80-90%', order: 1, min: -90, max: -80 },
    { id: 'b02', label: '下跌 70-80%', order: 2, min: -80, max: -70 },
    { id: 'b03', label: '下跌 60-70%', order: 3, min: -70, max: -60 },
    { id: 'b04', label: '下跌 50-60%', order: 4, min: -60, max: -50 },
    { id: 'b05', label: '下跌 40-50%', order: 5, min: -50, max: -40 },
    { id: 'b06', label: '下跌 30-40%', order: 6, min: -40, max: -30 },
    { id: 'b07', label: '下跌 20-30%', order: 7, min: -30, max: -20 },
    { id: 'b08', label: '下跌 10-20%', order: 8, min: -20, max: -10 },
    { id: 'b09', label: '下跌 0-10%', order: 9, min: -10, max: 0 },
    // 上漲區間
    { id: 'b10', label: '上漲 0-100%', order: 10, min: 0, max: 100 },
    { id: 'b11', label: '上漲 100-200%', order: 11, min: 100, max: 200 },
    { id: 'b12', label: '上漲 200-300%', order: 12, min: 200, max: 300 },
    { id: 'b13', label: '上漲 300-400%', order: 13, min: 300, max: 400 },
    { id: 'b14', label: '上漲 400-500%', order: 14, min: 400, max: 500 },
    { id: 'b15', label: '上漲 500-600%', order: 15, min: 500, max: 600 },
    { id: 'b16', label: '上漲 600-700%', order: 16, min: 600, max: 700 },
    { id: 'b17', label: '上漲 700-800%', order: 17, min: 700, max: 800 },
    { id: 'b18', label: '上漲 800-900%', order: 18, min: 800, max: 900 },
    { id: 'b19', label: '上漲 900-1000%', order: 19, min: 900, max: 1000 },
    { id: 'b20', label: '上漲 1000%+', order: 20, min: 1000, max: Infinity },
  ];

  // 為每個股票分配 bin
  const stockBinMap = new Map<string, string>();
  for (const [code, ret] of retMap) {
    for (const bin of BIN_DEFS) {
      if (ret >= bin.min && ret < bin.max) {
        stockBinMap.set(code, bin.id);
        break;
      }
    }
  }

  // 取得所有月份（格式 YYYY-MM）
  const allMonths: string[] = [
    ...new Set<string>(
      revenueData.map((r: any) => {
        const d = new Date(r.data_date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      })
    ),
  ].sort();

  // 建立 (binId, month) -> yoy[] map 以及 binId -> yoy[] (全年度匯總)
  const cellDataMap = new Map<string, number[]>();
  const binRevenueMap = new Map<string, number[]>();

  for (const row of revenueData) {
    const binId = stockBinMap.get(row.stock_code);
    if (!binId) continue;
    
    // 1. Cell Map
    const d = new Date(row.data_date);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const key = `${binId}::${month}`;
    if (!cellDataMap.has(key)) cellDataMap.set(key, []);
    cellDataMap.get(key)!.push(row.revenue_yoy as number);
    
    // 2. Bin Map (All Periods)
    if (!binRevenueMap.has(binId)) binRevenueMap.set(binId, []);
    binRevenueMap.get(binId)!.push(row.revenue_yoy as number);
  }

  // 計算 cell 統計
  const cells: HeatmapCell[] = [];
  for (const [key, values] of cellDataMap) {
    const [binId, month] = key.split('::');
    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const positiveRate = (values.filter((v) => v > 0).length / values.length) * 100;

    cells.push({
      binId,
      month,
      median: Math.round(median * 10) / 10,
      mean: Math.round(mean * 10) / 10,
      stdDev: Math.round(stdDev * 10) / 10,
      positiveRate: Math.round(positiveRate * 10) / 10,
      dataPoints: values.length,
    });
  }

  // 建立 ReturnBin 列表
  const binStockMap = new Map<string, number[]>();
  for (const [code, binId] of stockBinMap) {
    const ret = retMap.get(code)!;
    if (!binStockMap.has(binId)) binStockMap.set(binId, []);
    binStockMap.get(binId)!.push(ret);
  }

  const returnBins: ReturnBin[] = BIN_DEFS.filter((b) => binStockMap.has(b.id)).map((b) => {
    const rets = binStockMap.get(b.id) ?? [];
    const avgRet = rets.reduce((s, v) => s + v, 0) / rets.length;
    
    // 計算該 Bin 的全年度營收統計
    const revenues = binRevenueMap.get(b.id) ?? [];
    let meanRevenue = 0;
    let medianRevenue = 0;
    let stdDevRevenue = 0;
    let cvRevenue = 0;
    let iqrRevenue = 0;
    let minRevenue = 0;
    let maxRevenue = 0;
    let positiveRateRevenue = 0;

    if (revenues.length > 0) {
      const sortedRev = [...revenues].sort((x, y) => x - y);
      meanRevenue = revenues.reduce((s, v) => s + v, 0) / revenues.length;
      medianRevenue = sortedRev[Math.floor(sortedRev.length / 2)];
      const variance = revenues.reduce((s, v) => s + (v - meanRevenue) ** 2, 0) / revenues.length;
      stdDevRevenue = Math.sqrt(variance);
      minRevenue = sortedRev[0];
      maxRevenue = sortedRev[sortedRev.length - 1];
      
      const q1 = sortedRev[Math.floor(sortedRev.length * 0.25)];
      const q3 = sortedRev[Math.floor(sortedRev.length * 0.75)];
      iqrRevenue = q3 - q1;
      
      cvRevenue = meanRevenue !== 0 ? (stdDevRevenue / Math.abs(meanRevenue)) * 100 : 0;
      positiveRateRevenue = (revenues.filter(r => r > 0).length / revenues.length) * 100;
    }

    return {
      id: b.id,
      label: b.label,
      order: b.order,
      stockCount: rets.length,
      avgAnnualReturn: Math.round(avgRet * 10) / 10,
      meanRevenue: Math.round(meanRevenue * 10) / 10,
      medianRevenue: Math.round(medianRevenue * 10) / 10,
      stdDevRevenue: Math.round(stdDevRevenue * 10) / 10,
      cvRevenue: Math.round(cvRevenue * 100) / 100,
      iqrRevenue: Math.round(iqrRevenue * 10) / 10,
      minRevenue: Math.round(minRevenue * 10) / 10,
      maxRevenue: Math.round(maxRevenue * 10) / 10,
      positiveRateRevenue: Math.round(positiveRateRevenue * 10) / 10,
    };
  });

  return {
    year,
    months: allMonths,
    returnBins,
    cells,
    generatedAt: new Date().toISOString(),
  };
}

// ── 公開 Server Actions（帶快取） ─────────────────────────

export const getWinRateData = unstable_cache(
  async (year: number, low = 50, high = 100): Promise<WinRateYearData | null> => {
    try {
      const result = await fetchWinRateFromDB(year, low, high);
      if (result) return result;
    } catch (e) {
      console.error('[getWinRateData] DB error, falling back to JSON:', e);
    }
    // fallback：mock JSON
    const suffix = process.env.NODE_ENV === 'development' ? '.mock' : '';
    return readJsonFile<WinRateYearData>(`win-rate-${year}${suffix}.json`);
  },
  ['revenue-lab-win-rate-v2'],
  { revalidate: 3600 }
);

export const getHeatmapData = unstable_cache(
  async (year: number): Promise<HeatmapYearData | null> => {
    try {
      const result = await fetchHeatmapFromDB(year);
      if (result) return result;
    } catch (e) {
      console.error('[getHeatmapData] DB error, falling back to JSON:', e);
    }
    const suffix = process.env.NODE_ENV === 'development' ? '.mock' : '';
    return readJsonFile<HeatmapYearData>(`heatmap-${year}${suffix}.json`);
  },
  ['revenue-lab-heatmap'],
  { revalidate: 3600 }
);

export const getGoldenZoneStats = unstable_cache(
  async (): Promise<GoldenZoneStats | null> => {
    const suffix = process.env.NODE_ENV === 'development' ? '.mock' : '';
    return readJsonFile<GoldenZoneStats>(`golden-zone-stats${suffix}.json`);
  },
  ['revenue-lab-golden-zone'],
  { revalidate: 3600 }
);
