
import { getServiceClient } from '@/lib/supabase/service';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface RevenueRow {
  stock_code: string;
  data_date: string;
  revenue_yoy: number;
}

export interface RevenueFilter {
  yoyLow?: number;
  yoyHigh?: number;
}

type DbRow = Record<string, unknown>;

export async function fetchRevenueData(year: number, filters?: RevenueFilter): Promise<RevenueRow[]> {
  const supabase = getServiceClient() as SupabaseClient;

  // 月營收研究期間：前一年12月 至 目標年11月
  const revenueStart = `${year - 1}-12-01`;
  const revenueEnd = `${year}-11-30`;

  let query = supabase
    .from('stock_revenue_monthly')
    .select('stock_code, data_date, revenue_yoy')
    .gte('data_date', revenueStart)
    .lte('data_date', revenueEnd);

  if (filters?.yoyLow !== undefined) {
    query = query.gte('revenue_yoy', filters.yoyLow);
  }
  if (filters?.yoyHigh !== undefined) {
    query = query.lt('revenue_yoy', filters.yoyHigh);
  } else {
    // If no specific range, ensure not null if specifically looking for valid data
    query = query.not('revenue_yoy', 'is', null);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[RevenueRepo] fetchRevenueData error:', error.message);
    throw error;
  }

  return ((data ?? []) as DbRow[]) as unknown as RevenueRow[];
}
