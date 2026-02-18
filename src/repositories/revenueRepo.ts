
import { getServiceClient } from '@/lib/supabase/service';

export interface RevenueRow {
  stock_code: string;
  data_date: string;
  revenue_yoy: number;
}

export interface RevenueFilter {
  yoyLow?: number;
  yoyHigh?: number;
}

export async function fetchRevenueData(year: number, filters?: RevenueFilter): Promise<RevenueRow[]> {
  const supabase = getServiceClient();

  // 月營收研究期間：前一年12月 至 目標年11月
  const revenueStart = `${year - 1}-12-01`;
  const revenueEnd = `${year}-11-30`;

  let query = (supabase as any)
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

  const { data, error } = await query as { data: any[] | null; error: any };

  if (error) {
    console.error('[RevenueRepo] fetchRevenueData error:', error.message);
    throw error;
  }

  return (data ?? []) as RevenueRow[];
}
