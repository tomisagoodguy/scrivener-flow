import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/investment/broker-transactions?code=XXXX
 * 獲取個股的券商分點買賣超前15大匯總數據
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    
    if (!code) {
        return NextResponse.json({ error: 'Stock code required' }, { status: 400 });
    }

    try {
        const supabase = await createClient();
        
        const { data, error } = await supabase
            .from('stock_broker_transactions')
            .select('*')
            .eq('stock_code', code)
            .order('data_date', { ascending: false }) // Get latest dates first
            .limit(240); // User requested recent 240 days

        if (error) {
            console.error('Error fetching broker transactions:', error);
            return NextResponse.json(
                { error: 'Failed to fetch data' },
                { status: 500 }
            );
        }

        // Reverse to chronological order (oldest to newest) for the chart
        const sortedData = data ? [...data].reverse() : [];

        return NextResponse.json(sortedData);
    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
