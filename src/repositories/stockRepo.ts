
import { getServiceClient } from '@/lib/supabase/service';

export async function fetchStockNames(codes: string[]): Promise<Map<string, string>> {
  if (!codes.length) return new Map();

  const supabase = getServiceClient();
  const { data: nameData, error } = await (supabase as any)
    .from('stock_basic_info')
    .select('stock_code, name_short')
    .in('stock_code', codes) as { data: any[] | null; error: any };

  if (error) {
    console.error('[StockRepo] fetchStockNames error:', error.message);
    throw error;
  }

  const nameMap = new Map<string, string>();
  for (const row of nameData ?? []) {
    nameMap.set(row.stock_code, row.name_short);
  }
  return nameMap;
}
