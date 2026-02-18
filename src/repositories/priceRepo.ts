
import { getServiceClient } from '@/lib/supabase/service';

export interface PriceRow {
  stock_code: string;
  data_date: string;
  open: number;
  close: number;
}

export async function fetchPriceData(year: number, stockCodes?: string[]): Promise<{ startPrices: PriceRow[]; endPrices: PriceRow[] }> {
  const supabase = getServiceClient();
  
  // 股價期間：目標年6月（最早有資料）至 12月底
  const priceStart = `${year}-06-01`;
  const priceEnd = `${year}-12-31`;

  let queryStart = (supabase as any)
    .from('stock_prices_daily')
    .select('stock_code, data_date, open')
    .gte('data_date', priceStart)
    .order('data_date', { ascending: true });

  if (stockCodes && stockCodes.length > 0) {
    queryStart = queryStart.in('stock_code', stockCodes);
  }

  const { data: startData, error: startError } = await queryStart as { data: any[] | null; error: any };

  let queryEnd = (supabase as any)
    .from('stock_prices_daily')
    .select('stock_code, data_date, close')
    .lte('data_date', priceEnd)
    .order('data_date', { ascending: false });

  if (stockCodes && stockCodes.length > 0) {
    queryEnd = queryEnd.in('stock_code', stockCodes);
  }

  const { data: endData, error: endError } = await queryEnd as { data: any[] | null; error: any };

  if (startError || endError) {
    console.error('[PriceRepo] fetchPriceData error:', startError?.message, endError?.message);
    throw new Error(`DB Error: ${startError?.message || endError?.message}`);
  }

  return {
    startPrices: (startData ?? []) as PriceRow[],
    endPrices: (endData ?? []) as PriceRow[],
  };
}
