
import { getServiceClient } from '@/lib/supabase/service';
import type { SupabaseClient } from '@supabase/supabase-js';

type DbRow = Record<string, unknown>;

export async function fetchStockNames(codes: string[]): Promise<Map<string, string>> {
  if (!codes.length) return new Map();

  const supabase = getServiceClient() as SupabaseClient;
  const { data: nameData, error } = await supabase
    .from('stock_basic_info')
    .select('stock_code, name_short')
    .in('stock_code', codes);

  if (error) {
    console.error('[StockRepo] fetchStockNames error:', error.message);
    throw error;
  }

  const nameMap = new Map<string, string>();
  for (const row of ((nameData ?? []) as DbRow[])) {
    nameMap.set(row.stock_code as string, row.name_short as string);
  }
  return nameMap;
}
