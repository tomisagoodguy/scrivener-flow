import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { ETF_CODES } from '@/lib/investment/etfRegistry';
import { fetchQuantFiltersBatched } from '@/lib/investment/quantFilters';

/**
 * GET /api/investment/holdings?etf=00981A
 *
 * 無 etf 參數時回傳所有 ETF 的 union pool（依 weight 去重降序）
 * 用於個股儀表板的上下頁導航，確保與選股池順序一致
 * 回傳欄位含 quant filter（momentum_60d、it_buy_5d、filter_score）供排序用
 */
export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();
        const etfFilter = req.nextUrl.searchParams.get('etf');

        const targetCodes = etfFilter ? [etfFilter] : ETF_CODES;

        // 1. 各 ETF 最新日期（分開查，避免混合 limit 截斷問題）
        const latestByEtf: Record<string, string> = {};
        await Promise.all(
            targetCodes.map(async (code) => {
                const { data } = await supabase
                    .from('etf_holdings_snapshot')
                    .select('data_date')
                    .eq('etf_code', code)
                    .order('data_date', { ascending: false })
                    .limit(1);
                if (data?.[0]) latestByEtf[code] = data[0].data_date;
            })
        );

        if (Object.keys(latestByEtf).length === 0) return NextResponse.json([]);

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

        const stockCodes = Array.from(map.keys());

        // 4. 批次查詢 quant filter（避免 Supabase 1000-row 上限截斷）
        const quantFilters = await fetchQuantFiltersBatched(stockCodes);

        // 5. 合併 quant filter 欄位
        const result = Array.from(map.values()).map((h) => {
            const qf = quantFilters[h.stock_code];
            return {
                ...h,
                momentum_60d: qf?.momentum_60d ?? null,
                it_buy_5d: qf?.it_buy_5d ?? null,
                filter_score: qf?.filter_score ?? 0,
                momentum_pass: qf?.momentum_pass ?? false,
                it_buy_5d_pass: qf?.it_buy_5d_pass ?? false,
                rev_ma3_new_high: qf?.rev_ma3_new_high ?? false,
            };
        });

        result.sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));

        return NextResponse.json(result);
    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
