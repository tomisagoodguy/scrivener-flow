import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/investment/holdings
 * 
 * 獲取 ETF 持股列表（含價格、營收等完整資訊）
 * 用於儀表板頁面的股票導航功能
 */
export async function GET() {
    try {
        const supabase = await createClient();
        
        // 獲取持股快照數據（與主頁面相同的查詢）
        const { data, error } = await supabase
            .from('etf_holdings_snapshot')
            .select('*')
            .eq('etf_code', '00981A')
            .order('weight', { ascending: false });

        if (error) {
            console.error('Error fetching holdings:', error);
            return NextResponse.json(
                { error: 'Failed to fetch holdings' },
                { status: 500 }
            );
        }

        return NextResponse.json(data || []);
    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
