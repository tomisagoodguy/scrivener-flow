import { createClient } from '@/lib/supabase/server';
import { Holding } from '@/types/investment';
import { ETF_CODES } from '@/lib/investment/etfRegistry';

/** 資料完整度門檻：低於此比例視為該日資料不足，需回退至前一候選日期 */
const PRICE_COVERAGE_THRESHOLD = 0.5;

export interface DateFallbackResult<T> {
    dataDate: string | null;
    isFallback: boolean;
    data: T[];
}

/**
 * 共用的候選日期挑選邏輯：依序評估候選日期清單，選出第一個「有效股價比例 > 門檻」的日期；
 * 若最新日期資料不足且存在更早的候選日期，則回退並標記 isFallback: true。
 *
 * 與資料來源（Supabase）解耦——呼叫端傳入候選日期清單與依日期取資料的函式，方便單元測試。
 */
export async function selectDateWithFallback<T extends { price?: number | null }>(
    dateCandidates: { data_date: string }[] | null | undefined,
    fetchForDate: (date: string) => Promise<T[]>
): Promise<DateFallbackResult<T>> {
    if (!dateCandidates || dateCandidates.length === 0) {
        return { dataDate: null, isFallback: false, data: [] };
    }

    const latestDate = dateCandidates[0].data_date;
    const latestData = await fetchForDate(latestDate);
    const validPriceCount = latestData.filter(h => h.price && h.price > 0).length;
    const isSufficient = latestData.length > 0 && (validPriceCount / latestData.length) > PRICE_COVERAGE_THRESHOLD;

    if (isSufficient || dateCandidates.length <= 1) {
        return { dataDate: latestDate, isFallback: false, data: latestData };
    }

    const priorDate = dateCandidates[1].data_date;
    const priorData = await fetchForDate(priorDate);
    return { dataDate: priorDate, isFallback: true, data: priorData };
}

export async function getHoldingsForEtf(
    etfCode: string,
    supabase: Awaited<ReturnType<typeof createClient>>,
    canonicalDate?: string | null
) {
    if (canonicalDate) {
        const { data } = await supabase
            .from('etf_holdings_snapshot')
            .select('*')
            .eq('etf_code', etfCode)
            .eq('data_date', canonicalDate)
            .order('weight', { ascending: false });
        return { holdings: data || [], dataDate: canonicalDate, isFallback: false };
    }

    const { data: dateCandidates } = await supabase
        .from('etf_holdings_snapshot')
        .select('data_date, updated_at')
        .eq('etf_code', etfCode)
        .order('data_date', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(2);

    const fetchForDate = async (date: string) => {
        const { data } = await supabase
            .from('etf_holdings_snapshot')
            .select('*')
            .eq('etf_code', etfCode)
            .eq('data_date', date)
            .order('weight', { ascending: false });
        return data || [];
    };

    const { dataDate, isFallback, data } = await selectDateWithFallback(dateCandidates, fetchForDate);
    return { holdings: data, dataDate, isFallback };
}

export async function getAllHoldings(): Promise<{
    byEtf: Record<string, Holding[]>;
    latestDate: string | null;
}> {
    const supabase = await createClient();

    // 取全局最新日期，強制所有 ETF 使用同一 canonical date，避免聚合視圖不一致
    const { data: latestRow } = await supabase
        .from('etf_holdings_snapshot')
        .select('data_date')
        .order('data_date', { ascending: false })
        .limit(1)
        .single();
    const canonicalDate = latestRow?.data_date ?? null;

    const results = await Promise.all(
        ETF_CODES.map(code => getHoldingsForEtf(code, supabase, canonicalDate))
    );

    const allCodes = [...new Set(results.flatMap(r => r.holdings.map(h => h.stock_code)))];

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 310);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const [industryData, revData, priceData, priceHistData] = await Promise.all([
        supabase.from('stock_basic_info').select('stock_code, industry').in('stock_code', allCodes),
        supabase.from('stock_revenue_monthly')
            .select('stock_code, data_date, revenue_yoy, revenue_mom')
            .in('stock_code', allCodes)
            .order('data_date', { ascending: false }),
        supabase.from('stock_prices_daily')
            .select('stock_code, data_date, close, amount, margin_ratio')
            .in('stock_code', allCodes)
            .order('data_date', { ascending: false })
            .limit(2 * allCodes.length),
        supabase.from('stock_prices_daily')
            .select('stock_code, close')
            .in('stock_code', allCodes)
            .gte('data_date', cutoffStr)
            .order('data_date', { ascending: false }),
    ]);

    const industryMap: Record<string, string> = {};
    industryData.data?.forEach(i => { industryMap[i.stock_code] = i.industry; });

    const revMap: Record<string, { date: string; yoy: number; mom: number }> = {};
    revData.data?.forEach(r => {
        if (!revMap[r.stock_code]) {
            revMap[r.stock_code] = { date: r.data_date.substring(0, 7), yoy: r.revenue_yoy, mom: r.revenue_mom };
        }
    });

    const highsByCode: Record<string, number[]> = {};
    for (const row of priceHistData.data ?? []) {
        if (!highsByCode[row.stock_code]) highsByCode[row.stock_code] = [];
        highsByCode[row.stock_code].push(Number(row.close));
    }
    const highMap: Record<string, { is_high_5d: boolean; is_high_20d: boolean; is_high_200d: boolean }> = {};
    for (const [code, closes] of Object.entries(highsByCode)) {
        if (closes.length === 0) continue;
        const latest = closes[0];
        const h5 = closes.slice(0, 5);
        const h20 = closes.slice(0, 20);
        const h200 = closes.slice(0, 200);
        highMap[code] = {
            is_high_5d: h5.length >= 5 && latest >= Math.max(...h5),
            is_high_20d: h20.length >= 20 && latest >= Math.max(...h20),
            is_high_200d: h200.length >= 200 && latest >= Math.max(...h200),
        };
    }

    const priceMap: Record<string, { price: number; change_percent: number; amount: number | null; margin_ratio: number | null }> = {};
    const grouped: Record<string, typeof priceData.data> = {};
    for (const row of priceData.data ?? []) {
        if (!grouped[row.stock_code]) grouped[row.stock_code] = [];
        if (grouped[row.stock_code]!.length < 2) grouped[row.stock_code]!.push(row);
    }
    for (const [code, rows] of Object.entries(grouped)) {
        if (!rows || rows.length === 0) continue;
        const latest = rows[0];
        const prev = rows[1];
        const close = Number(latest.close ?? 0);
        const prevClose = prev ? Number(prev.close ?? 0) : 0;
        priceMap[code] = {
            price: close,
            change_percent: prevClose > 0 ? Number(((close / prevClose - 1) * 100).toFixed(2)) : 0,
            amount: latest.amount ? Number(latest.amount) : null,
            margin_ratio: latest.margin_ratio ? Number(latest.margin_ratio) : null,
        };
    }

    const byEtf: Record<string, Holding[]> = {};
    let latestDate: string | null = null;

    for (let i = 0; i < ETF_CODES.length; i++) {
        const code = ETF_CODES[i];
        const { holdings, dataDate } = results[i];
        if (dataDate && (!latestDate || dataDate > latestDate)) latestDate = dataDate;

        byEtf[code] = holdings.map(h => {
            const rev = revMap[h.stock_code];
            const p = priceMap[h.stock_code];
            return {
                ...h,
                price: h.price ?? p?.price ?? null,
                change_percent: h.change_percent ?? p?.change_percent ?? null,
                amount: h.amount ?? p?.amount ?? null,
                margin_ratio: h.margin_ratio ?? p?.margin_ratio ?? null,
                industry: industryMap[h.stock_code] || '未知',
                revenue_month: rev?.date || null,
                revenue_yoy: rev?.yoy ?? null,
                revenue_mom: rev?.mom ?? null,
                is_high_5d: highMap[h.stock_code]?.is_high_5d ?? false,
                is_high_20d: highMap[h.stock_code]?.is_high_20d ?? false,
                is_high_200d: highMap[h.stock_code]?.is_high_200d ?? false,
            } as Holding;
        });
    }

    return { byEtf, latestDate };
}

export function buildUnionHoldings(byEtf: Record<string, Holding[]>): Holding[] {
    const map = new Map<string, Holding>();
    for (const [, holdings] of Object.entries(byEtf)) {
        for (const h of holdings) {
            const existing = map.get(h.stock_code);
            if (!existing || (h.weight ?? 0) > (existing.weight ?? 0)) {
                map.set(h.stock_code, h);
            }
        }
    }
    return Array.from(map.values());
}
