import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * GET /api/investment/chips?code=XXXX&weeks=48
 * 返回指定股票的股權分散數據（集保資料）
 * 預設返回近 48 週資料
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const weeks = parseInt(searchParams.get('weeks') || '48');

    if (!code) {
      return NextResponse.json(
        { error: 'Missing stock code parameter' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('stock_shareholder_weekly')
      .select('data_date, shareholder_tier, holder_count, shares_held, custody_ratio')
      .eq('stock_code', code)
      .order('data_date', { ascending: false })
      .order('shareholder_tier', { ascending: true });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch shareholder data' },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'No shareholder data found for this stock' },
        { status: 404 }
      );
    }

    // 取最近 N 週的日期
    const uniqueDates = [...new Set(data.map(d => d.data_date))]
      .sort()
      .reverse()
      .slice(0, weeks);

    // 過濾並重新排序
    const filtered = data
      .filter(d => uniqueDates.includes(d.data_date))
      .sort((a, b) => a.data_date.localeCompare(b.data_date));

    return NextResponse.json(filtered);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
