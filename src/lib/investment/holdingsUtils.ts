import { createClient } from '@/lib/supabase/server';
import { Holding } from '@/types/investment';
import { ETF_CODES } from '@/lib/investment/etfRegistry';

async function getHoldingsForEtf(
    etfCode: string,
    supabase: Awaited<ReturnType<typeof createClient>>
) {
    const { data: dateCandidates } = await supabase
        .from('etf_holdings_snapshot')
        .select('data_date, updated_at')
        .eq('etf_code', etfCode)
        .order('data_date', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(2);

    if (!dateCandidates || dateCandidates.length === 0) return { holdings: [], dataDate: null };

    const fetchForDate = async (date: string) => {
        const { data } = await supabase
            .from('etf_holdings_snapshot')
            .select('*')
            .eq('etf_code', etfCode)
            .eq('data_date', date)
            .order('weight', { ascending: false });
        return data || [];
    };

    let targetDate = dateCandidates[0].data_date;
    let data = await fetchForDate(targetDate);

    const validPriceCount = data.filter(h => h.price && h.price > 0).length;
    if (data.length > 0 && (validPriceCount / data.length) <= 0.5 && dateCandidates.length > 1) {
        targetDate = dateCandidates[1].data_date;
        data = await fetchForDate(targetDate);
    }

    return { holdings: data, dataDate: targetDate };
}

export async function getAllHoldings(): Promise<{
    byEtf: Record<string, Holding[]>;
    latestDate: string | null;
}> {
    const supabase = await createClient();

    const results = await Promise.all(
        ETF_CODES.map(code => getHoldingsForEtf(code, supabase))
    );

    const allCodes = [...new Set(results.flatMap(r => r.holdings.map(h => h.stock_code)))];

    const [industryData, revData, priceData] = await Promise.all([
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
    ]);

    const industryMap: Record<string, string> = {};
    industryData.data?.forEach(i => { industryMap[i.stock_code] = i.industry; });

    const revMap: Record<string, { date: string; yoy: number; mom: number }> = {};
    revData.data?.forEach(r => {
        if (!revMap[r.stock_code]) {
            revMap[r.stock_code] = { date: r.data_date.substring(0, 7), yoy: r.revenue_yoy, mom: r.revenue_mom };
        }
    });

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
