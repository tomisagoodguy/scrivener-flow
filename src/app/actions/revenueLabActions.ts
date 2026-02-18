'use server';

import { unstable_cache } from 'next/cache';
import { readFile } from 'fs/promises';
import path from 'path';
import { fetchWinRateFromDB, fetchHeatmapFromDB } from '@/services/revenueLabService';
import type {
  WinRateYearData,
  HeatmapYearData,
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
