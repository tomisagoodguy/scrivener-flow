import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { ETF_CODES } from '@/lib/investment/etfRegistry';

/**
 * GET /api/investment/holdings?etf=00981A
 *
 * 無 etf 參數時回傳所有 ETF 的 union pool（依 weight 去重降序）
 * 用於個股儀表板的上下頁導航，確保與選股池順序一致
 */
export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();
        const etfFilter = req.nextUrl.searchParams.get('etf');

        const targetCodes = etfFilter ? [etfFilter] : ETF_CODES;

        // 1. 各 ETF 最新日期
        const { data: latestDateData } = await supabase
            .from('etf_holdings_snapshot')
            .select('etf_code, data_date')
            .in('etf_code', targetCodes)
            .order('data_date', { ascending: false })
            .limit(targetCodes.length * 2);

        if (!latestDateData || latestDateData.length === 0) return NextResponse.json([]);

        // 每支 ETF 取最新一筆日期
        const latestByEtf: Record<string, string> = {};
        for (const row of latestDateData) {
            if (!latestByEtf[row.etf_code]) latestByEtf[row.etf_code] = row.data_date;
        }

        // 2. 取各 ETF 持股
        const snapshots = await Promise.all(
            Object.entries(latestByEtf).map(([code, date]) =>
                supabase
                    .from('etf_holdings_snapshot')
                    .select('stock_code, stock_name, weight, etf_code')
                    .eq('etf_code', code)
                    .eq('data_date', date)
                    .order('weight', { ascending: false })
            )
        );

        // 3. Union：同一 stock_code 保留 weight 最高那筆
        const map = new Map<string, { stock_code: string; stock_name: string; weight: number; etf_code: string }>();
        for (const res of snapshots) {
            for (const h of res.data ?? []) {
                const existing = map.get(h.stock_code);
                if (!existing || (h.weight ?? 0) > (existing.weight ?? 0)) {
                    map.set(h.stock_code, h);
                }
            }
        }

        const result = Array.from(map.values()).sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));

        return NextResponse.json(result);
    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
