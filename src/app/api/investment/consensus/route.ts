import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface OverlapRow {
    stock_code: string;
    data_date: string;
    etf_count: number;
    total_weight: number;
    etf_list: Array<{ etf_code: string; weight: number }>;
    stock_name?: string;
}

/**
 * GET /api/investment/consensus
 *
 * 查詢 etf_stock_overlap，回傳指定日期的共識持股排行。
 *
 * Query params:
 *   date          - 查詢日期（YYYY-MM-DD），預設今日
 *   min_etf_count - 最少被幾檔 ETF 持有，預設 2
 *   limit         - 回傳筆數上限，預設 50
 *
 * Response: { data: OverlapRow[], date: string, total: number }
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = request.nextUrl;
        const minEtfCount = parseInt(searchParams.get('min_etf_count') ?? '2', 10);
        const limit = parseInt(searchParams.get('limit') ?? '50', 10);
        const requestedDate = searchParams.get('date');

        const supabase = await createClient();

        // 決定查詢日期：先嘗試傳入日期，無資料時 fallback 最近一個有資料日期
        let queryDate: string;

        if (requestedDate) {
            const { data: check } = await supabase
                .from('etf_stock_overlap')
                .select('data_date')
                .eq('data_date', requestedDate)
                .limit(1);

            if (check && check.length > 0) {
                queryDate = requestedDate;
            } else {
                // fallback 最近一日
                const { data: latest } = await supabase
                    .from('etf_stock_overlap')
                    .select('data_date')
                    .lt('data_date', requestedDate)
                    .order('data_date', { ascending: false })
                    .limit(1);
                queryDate = latest?.[0]?.data_date ?? requestedDate;
            }
        } else {
            // 無傳入日期：取最新有資料日期
            const { data: latest } = await supabase
                .from('etf_stock_overlap')
                .select('data_date')
                .order('data_date', { ascending: false })
                .limit(1);

            if (!latest || latest.length === 0) {
                return NextResponse.json({ data: [], date: '', total: 0 });
            }
            queryDate = latest[0].data_date;
        }

        // 查詢共識持股（加入 etf_holdings_snapshot 取得股票名稱）
        const { data, error } = await supabase
            .from('etf_stock_overlap')
            .select(`
                stock_code,
                data_date,
                etf_count,
                total_weight,
                etf_list
            `)
            .eq('data_date', queryDate)
            .gte('etf_count', minEtfCount)
            .order('etf_count', { ascending: false })
            .order('total_weight', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching consensus:', error);
            return NextResponse.json(
                { error: 'Failed to fetch consensus data' },
                { status: 500 }
            );
        }

        if (!data || data.length === 0) {
            return NextResponse.json({ data: [], date: queryDate, total: 0 });
        }

        // 補充股票名稱（從 etf_holdings_snapshot 取最近一筆）
        const stockCodes = data.map((r) => r.stock_code);
        const { data: nameData } = await supabase
            .from('etf_holdings_snapshot')
            .select('stock_code, stock_name')
            .in('stock_code', stockCodes)
            .eq('data_date', queryDate);

        const nameMap: Record<string, string> = {};
        for (const row of nameData ?? []) {
            nameMap[row.stock_code] = row.stock_name;
        }

        const enriched: OverlapRow[] = data.map((row) => ({
            ...row,
            stock_name: nameMap[row.stock_code] ?? '',
        }));

        return NextResponse.json({
            data: enriched,
            date: queryDate,
            total: enriched.length,
        });
    } catch (err) {
        console.error('Unexpected error in consensus route:', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
