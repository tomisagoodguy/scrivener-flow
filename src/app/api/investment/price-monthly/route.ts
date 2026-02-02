import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * GET /api/investment/price-monthly?code=XXXX
 * 返回月均價數據（將日線價格 resample 為月均價）
 * 計算邏輯：取每月的平均收盤價
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { error: 'Missing stock code parameter' },
        { status: 400 }
      );
    }

    // 取得近 2 年的日線數據（保險起見），然後在前端進行月resampling
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    const dateFilter = twoYearsAgo.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('stock_prices_daily')
      .select('data_date, close')
      .eq('stock_code', code)
      .gte('data_date', dateFilter)
      .order('data_date', { ascending: true });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch price data' },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'No price data found for this stock' },
        { status: 404 }
      );
    }

    // 將日線數據轉為月均價
    const monthlyPrices = calculateMonthlyAverage(data);

    return NextResponse.json(monthlyPrices);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

interface DailyPrice {
  data_date: string;
  close: number;
}

interface MonthlyPrice {
  month: string;
  avg_price: number;
}

/**
 * 計算月均價
 * 每個月的平均收盤價
 */
function calculateMonthlyAverage(dailyData: DailyPrice[]): MonthlyPrice[] {
  const monthlyMap = new Map<string, number[]>();

  // 按月份分組
  dailyData.forEach(({ data_date, close }) => {
    if (!close) return;
    
    const month = data_date.substring(0, 7); // YYYY-MM
    
    if (!monthlyMap.has(month)) {
      monthlyMap.set(month, []);
    }
    monthlyMap.get(month)!.push(close);
  });

  // 計算每月平均
  const result: MonthlyPrice[] = [];
  monthlyMap.forEach((prices, month) => {
    const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    result.push({
      month,
      avg_price: parseFloat(avg.toFixed(2))
    });
  });

  // 按日期排序
  result.sort((a, b) => a.month.localeCompare(b.month));

  // 返回最近24個月
  return result.slice(-24);
}
