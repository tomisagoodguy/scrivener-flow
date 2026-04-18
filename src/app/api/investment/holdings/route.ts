import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { ETF_CODES } from '@/lib/investment/etfRegistry';

/**
 * GET /api/investment/holdings?etf=00981A
 *
 * 無 etf 參數時回傳所有 ETF 的 union pool（依 weight 去重降序）
 * 用於個股儀表板的上下頁導航，確保與選股池順序一致
 * 回傳欄位含 quant filter（momentum_60d、it_buy_10d、filter_score）供排序用
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

        // 4. 查詢 quant filter 資料（momentum_60d、it_buy_10d）
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 100);
        const cutoffStr = cutoffDate.toISOString().slice(0, 10);

        const [recentPriceRes, oldPriceRes, revenueRes] = await Promise.all([
            supabase
                .from('stock_prices_daily')
                .select('stock_code, data_date, close, it_buy')
                .in('stock_code', stockCodes)
                .order('data_date', { ascending: false })
                .limit(10 * stockCodes.length),
            supabase
                .from('stock_prices_daily')
                .select('stock_code, data_date, close')
                .in('stock_code', stockCodes)
                .gte('data_date', cutoffStr)
                .order('data_date', { ascending: true })
                .limit(5 * stockCodes.length),
            supabase
                .from('stock_revenue_monthly')
                .select('stock_code, data_date, revenue')
                .in('stock_code', stockCodes)
                .order('data_date', { ascending: false })
                .limit(15 * stockCodes.length),
        ]);

        const oldCloseMap: Record<string, number> = {};
        for (const row of oldPriceRes.data ?? []) {
            if (!oldCloseMap[row.stock_code] && Number(row.close) > 0) {
                oldCloseMap[row.stock_code] = Number(row.close);
            }
        }

        const recentPricesMap: Record<string, { stock_code: string; data_date: string; close: number; it_buy: number | null }[]> = {};
        for (const row of recentPriceRes.data ?? []) {
            if (!recentPricesMap[row.stock_code]) recentPricesMap[row.stock_code] = [];
            recentPricesMap[row.stock_code].push(row);
        }

        const revenueMap: Record<string, { data_date: string; revenue: number }[]> = {};
        for (const row of revenueRes.data ?? []) {
            if (!revenueMap[row.stock_code]) revenueMap[row.stock_code] = [];
            revenueMap[row.stock_code].push(row);
        }

        // 5. 合併 quant filter 欄位
        const result = Array.from(map.values()).map((h) => {
            const prices = (recentPricesMap[h.stock_code] ?? [])
                .sort((a, b) => new Date(b.data_date).getTime() - new Date(a.data_date).getTime());

            let momentum_60d: number | null = null;
            let it_buy_10d: number | null = null;
            let momentum_pass = false;
            let it_buy_10d_pass = false;

            if (prices.length >= 1) {
                const latestClose = Number(prices[0].close);
                const oldClose = oldCloseMap[h.stock_code];
                if (latestClose > 0 && oldClose && oldClose > 0) {
                    momentum_60d = Number(((latestClose / oldClose - 1) * 100).toFixed(2));
                    momentum_pass = momentum_60d > 0;
                }
                it_buy_10d = prices.reduce((sum, p) => sum + Number(p.it_buy || 0), 0);
                it_buy_10d_pass = it_buy_10d > 0;
            }

            const revs = (revenueMap[h.stock_code] ?? [])
                .sort((a, b) => new Date(b.data_date).getTime() - new Date(a.data_date).getTime());

            let rev_ma3_new_high = false;
            if (revs.length >= 14) {
                const ma3Series: number[] = [];
                for (let i = 0; i <= 11; i++) {
                    const avg = (Number(revs[i]?.revenue || 0) + Number(revs[i + 1]?.revenue || 0) + Number(revs[i + 2]?.revenue || 0)) / 3;
                    ma3Series.push(avg);
                }
                const rollingMax = Math.max(...ma3Series);
                rev_ma3_new_high = ma3Series[0] > 0 && Math.abs(ma3Series[0] - rollingMax) < 0.01;
            }

            const filter_score = (momentum_pass ? 1 : 0) + (it_buy_10d_pass ? 1 : 0) + (rev_ma3_new_high ? 1 : 0);

            return { ...h, momentum_60d, it_buy_10d, filter_score, momentum_pass, it_buy_10d_pass, rev_ma3_new_high };
        });

        result.sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));

        return NextResponse.json(result);
    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
