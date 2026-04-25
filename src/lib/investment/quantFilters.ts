import { createClient } from '@/lib/supabase/server';

export interface QuantFilter {
    momentum_60d: number | null;
    momentum_pass: boolean;
    it_buy_5d: number | null;
    it_buy_5d_pass: boolean;
    rev_ma3: number | null;
    rev_ma3_new_high: boolean;
    revenue_yoy: number | null;
    filter_score: number;
}

export async function fetchQuantFiltersBatched(stockCodes: string[]): Promise<Record<string, QuantFilter>> {
    const BATCH = 60; // keep each query under Supabase's 1000-row limit (15 × 60 = 900)
    const chunks: string[][] = [];
    for (let i = 0; i < stockCodes.length; i += BATCH) chunks.push(stockCodes.slice(i, i + BATCH));
    const parts = await Promise.all(chunks.map(c => fetchQuantFilters(c)));
    return Object.assign({}, ...parts);
}

export async function fetchQuantFilters(stockCodes: string[]): Promise<Record<string, QuantFilter>> {
    if (stockCodes.length === 0) return {};
    const supabase = await createClient();

    const { data: recentPriceData } = await supabase
        .from('stock_prices_daily')
        .select('stock_code, data_date, close, it_buy')
        .in('stock_code', stockCodes)
        .order('data_date', { ascending: false })
        .limit(10 * stockCodes.length);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 100);
    const cutoffStr = cutoffDate.toISOString().slice(0, 10);

    const { data: oldPriceData } = await supabase
        .from('stock_prices_daily')
        .select('stock_code, data_date, close')
        .in('stock_code', stockCodes)
        .gte('data_date', cutoffStr)
        .order('data_date', { ascending: true })
        .limit(5 * stockCodes.length);

    const { data: revenueData } = await supabase
        .from('stock_revenue_monthly')
        .select('stock_code, data_date, revenue')
        .in('stock_code', stockCodes)
        .order('data_date', { ascending: false })
        .limit(15 * stockCodes.length);

    const oldCloseMap: Record<string, number> = {};
    for (const row of oldPriceData ?? []) {
        if (!oldCloseMap[row.stock_code] && Number(row.close) > 0) {
            oldCloseMap[row.stock_code] = Number(row.close);
        }
    }

    const recentPricesMap: Record<string, typeof recentPriceData> = {};
    for (const row of recentPriceData ?? []) {
        if (!recentPricesMap[row.stock_code]) recentPricesMap[row.stock_code] = [];
        recentPricesMap[row.stock_code]!.push(row);
    }

    const result: Record<string, QuantFilter> = {};

    for (const code of stockCodes) {
        const prices = (recentPricesMap[code] ?? [])
            .sort((a, b) => new Date(b.data_date).getTime() - new Date(a.data_date).getTime());

        let momentum_60d: number | null = null;
        let momentum_pass = false;
        let it_buy_5d: number | null = null;
        let it_buy_5d_pass = false;

        if (prices.length >= 1) {
            const latestClose = Number(prices[0].close);
            const oldClose = oldCloseMap[code];
            if (latestClose > 0 && oldClose && oldClose > 0) {
                momentum_60d = Number(((latestClose / oldClose - 1) * 100).toFixed(2));
                momentum_pass = momentum_60d > 0;
            }
            const itBuys = prices.slice(0, 5).map(p => Number(p.it_buy || 0));
            it_buy_5d = itBuys.reduce((a, b) => a + b, 0);
            it_buy_5d_pass = it_buy_5d > 0;
        }

        const revs = (revenueData?.filter(r => r.stock_code === code) || [])
            .sort((a, b) => new Date(b.data_date).getTime() - new Date(a.data_date).getTime());

        let rev_ma3: number | null = null;
        let rev_ma3_new_high = false;

        if (revs.length >= 14) {
            const ma3Series: number[] = [];
            for (let i = 0; i <= 11; i++) {
                const avg = (Number(revs[i]?.revenue || 0) + Number(revs[i + 1]?.revenue || 0) + Number(revs[i + 2]?.revenue || 0)) / 3;
                ma3Series.push(avg);
            }
            rev_ma3 = Number(ma3Series[0].toFixed(0));
            const rollingMax = Math.max(...ma3Series);
            rev_ma3_new_high = ma3Series[0] > 0 && Math.abs(ma3Series[0] - rollingMax) < 0.01;
        } else if (revs.length >= 3) {
            rev_ma3 = Number(((Number(revs[0]?.revenue || 0) + Number(revs[1]?.revenue || 0) + Number(revs[2]?.revenue || 0)) / 3).toFixed(0));
        }

        let revenue_yoy: number | null = null;
        if (revs.length >= 13) {
            const curr = Number(revs[0]?.revenue || 0);
            const prev = Number(revs[12]?.revenue || 0);
            if (prev !== 0) revenue_yoy = Number(((curr - prev) / Math.abs(prev) * 100).toFixed(1));
        }

        const filter_score = (momentum_pass ? 1 : 0) + (it_buy_5d_pass ? 1 : 0) + (rev_ma3_new_high ? 1 : 0);
        result[code] = { momentum_60d, momentum_pass, it_buy_5d, it_buy_5d_pass, rev_ma3, rev_ma3_new_high, revenue_yoy, filter_score };
    }

    return result;
}
