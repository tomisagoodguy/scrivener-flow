import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
        return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Fetch daily prices for the stock
    const { data, error } = await supabase
        .from('stock_prices_daily')
        .select('data_date, open, high, low, close, volume')
        .eq('stock_code', code)
        .order('data_date', { ascending: true });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
        return NextResponse.json({ error: 'No data found' }, { status: 404 });
    }

    // Format for lightweight-charts
    // Candlestick expects { time: 'YYYY-MM-DD', open: X, high: Y, low: Z, close: W }
    // Volume expects { time: 'YYYY-MM-DD', value: V, color: '...' }
    
    const formattedData = data.map((item) => {
        const time = new Date(item.data_date).toISOString().split('T')[0];
        return {
            time,
            open: Number(item.open),
            high: Number(item.high),
            low: Number(item.low),
            close: Number(item.close),
            value: Number(item.volume)
        };
    });

    return NextResponse.json(formattedData);
}
