// ============================================================
// Revenue Lab 共用型別定義
// 對應 StockRevenueLab 的三大分析模組
// ============================================================

// ── 模組 A：WinRateLab（勝率回測）──────────────────────────

export interface StockDetail {
  code: string;
  name: string;
  annualReturn: number; // 年度漲幅 %
  burstMonths: number;  // 達標月數
  avgYoy: number;       // 平均 YOY %
}

export interface WinRateBucket {
  burstCount: number;    // 達標次數 (0-12)
  stockCount: number;    // 股票檔數
  avgReturn: number;     // 平均年度漲幅 %
  medianReturn: number;  // 中位數漲幅 %
  winRate: number;       // 勝率 (漲幅 > 20%) %
  doubleRate: number;    // 翻倍率 (漲幅 > 100%) %
  stdDev: number;        // 標準差 %
  minReturn: number;     // 最低漲幅 %
  maxReturn: number;     // 最高漲幅 %
  stocks: StockDetail[]; // 最多 50 筆
}

export interface WinRateYearData {
  year: number;
  metric: 'yoy_pct';
  threshold: { low: number; high: number };
  generatedAt: string; // ISO 8601
  data: WinRateBucket[];
}

export interface WinRateFilters {
  year: number;
  yoyLow: number;  // 預設 50
  yoyHigh: number; // 預設 100
}

// ── 模組 B：RevenueHeatmap（熱力圖）────────────────────────

export interface ReturnBin {
  id: string;            // e.g. '下跌-10%至0%'
  order: number;         // 排序用（0 = 最慘下跌）
  label: string;         // 顯示用標籤
  stockCount: number;
  avgAnnualReturn: number;
  // 新增：AI 分析所需的全維度統計
  meanRevenue?: number;
  medianRevenue?: number;
  stdDevRevenue?: number;
  cvRevenue?: number;
  iqrRevenue?: number;
  minRevenue?: number;
  maxRevenue?: number;
  positiveRateRevenue?: number;
}

export interface HeatmapCell {
  binId: string;
  month: string;         // e.g. '2024-03'
  median: number;        // YOY 中位數 %
  mean: number;          // YOY 平均值 %
  stdDev: number;        // YOY 標準差 %
  positiveRate: number;  // 正增長比例 %
  dataPoints: number;    // 樣本數
}

export interface HeatmapYearData {
  year: number;
  generatedAt: string;
  returnBins: ReturnBin[];
  months: string[];      // ['2023-12', '2024-01', ..., '2024-11']
  cells: HeatmapCell[];
}

export type HeatmapStatMode = 'median' | 'mean' | 'stdDev' | 'positiveRate';

// ── 模組 C：GoldenGrowthZone 強化 ──────────────────────────

export interface StockHistoricalStats {
  winRate: number;      // 歷史勝率 (漲幅 > 20%) %
  avgReturn: number;    // 歷史平均年度漲幅 %
  burstMonths: number;  // 當前連續爆發月數
  qualityScore: number; // avgReturn * winRate / stdDev（品質評分）
  sampleYears: number;  // 有效樣本年數
  sampleCount: number;  // 總樣本次數
}

export interface GoldenZoneStats {
  updatedAt: string;
  yoyRange: { low: number; high: number };
  stats: Record<string, StockHistoricalStats>; // key: stock_code
}
