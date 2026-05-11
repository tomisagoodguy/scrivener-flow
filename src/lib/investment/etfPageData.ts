import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { Holding, DiffLog } from '@/types/investment';
export { fetchQuantFilters } from '@/lib/investment/quantFilters';
export type { QuantFilter } from '@/lib/investment/quantFilters';

export interface RankingHistoryRow {
    data_date: string;
    stock_code: string;
    stock_name: string;
    weight: number;
    rank: number;
}

export interface EtfNewsRow {
    stock_code: string;
    pub_date: string;
    pub_time: string | null;
    title: string;
    source: string;
    url: string | null;
}

export type DiffLogWithMeta = DiffLog;

export async function getHoldings(etfCode: string): Promise<{
    holdings: Holding[];
    updatedAt: string | null;
    dataDate: string | null;
}> {
    const supabase = await createClient();

    const { data: dateCandidates } = await supabase
        .from('etf_holdings_snapshot')
        .select('data_date, updated_at')
        .eq('etf_code', etfCode)
        .order('data_date', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(2);

    if (!dateCandidates || dateCandidates.length === 0) {
        return { holdings: [], updatedAt: null, dataDate: null };
    }

    const fetchHoldingsForDate = async (date: string) => {
        const { data } = await supabase
            .from('etf_holdings_snapshot')
            .select('*')
            .eq('etf_code', etfCode)
            .eq('data_date', date)
            .order('weight', { ascending: false });
        return data || [];
    };

    let targetDate = dateCandidates[0].data_date;
    let targetUpdatedAt = dateCandidates[0].updated_at;
    let data = await fetchHoldingsForDate(targetDate);

    const validPriceCount = data.filter(h => h.price && h.price > 0).length;
    const isValid = data.length > 0 && (validPriceCount / data.length) > 0.5;

    if (!isValid && dateCandidates.length > 1) {
        targetDate = dateCandidates[1].data_date;
        targetUpdatedAt = dateCandidates[1].updated_at;
        data = await fetchHoldingsForDate(targetDate);
    }

    const codes = (data || []).map(h => h.stock_code);

    const [{ data: industryData }, { data: revData }] = await Promise.all([
        supabase.from('stock_basic_info').select('stock_code, industry').in('stock_code', codes),
        supabase.from('stock_revenue_monthly')
            .select('stock_code, data_date, revenue_yoy, revenue_mom')
            .in('stock_code', codes)
            .order('data_date', { ascending: false }),
    ]);

    const industryMap: Record<string, string> = {};
    industryData?.forEach(i => { industryMap[i.stock_code] = i.industry; });

    const revMap: Record<string, { date: string; yoy: number; mom: number }> = {};
    revData?.forEach(r => {
        if (!revMap[r.stock_code]) {
            revMap[r.stock_code] = { date: r.data_date.substring(0, 7), yoy: r.revenue_yoy, mom: r.revenue_mom };
        }
    });

    const missingPriceCodes = (data || []).filter(h => !h.price || h.price === 0).map(h => h.stock_code);
    const priceMap: Record<string, { price: number; change_percent: number; amount: number | null; margin_ratio: number | null }> = {};

    if (missingPriceCodes.length > 0) {
        const { data: latestPrices } = await supabase
            .from('stock_prices_daily')
            .select('stock_code, data_date, close, amount, margin_ratio')
            .in('stock_code', missingPriceCodes)
            .order('data_date', { ascending: false })
            .limit(2 * missingPriceCodes.length);

        const grouped: Record<string, typeof latestPrices> = {};
        for (const row of latestPrices ?? []) {
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
    }

    const holdings = (data || []).map(h => {
        const rev = revMap[h.stock_code];
        const pi = priceMap[h.stock_code];
        return {
            ...h,
            price: h.price ?? pi?.price ?? null,
            change_percent: h.change_percent ?? pi?.change_percent ?? null,
            amount: h.amount ?? pi?.amount ?? null,
            margin_ratio: h.margin_ratio ?? pi?.margin_ratio ?? null,
            industry: industryMap[h.stock_code] || '未知',
            revenue_month: rev?.date || null,
            revenue_yoy: rev?.yoy ?? null,
            revenue_mom: rev?.mom ?? null,
        };
    }) as Holding[];

    return { holdings, updatedAt: targetUpdatedAt, dataDate: targetDate };
}

export async function getRankingHistory(etfCode: string): Promise<RankingHistoryRow[]> {
    const supabase = await createClient();

    const { count } = await supabase
        .from('etf_weight_history')
        .select('*', { count: 'exact', head: true })
        .eq('etf_code', etfCode);

    if (count && count > 0) {
        const { data: historyData } = await supabase
            .from('etf_weight_history')
            .select('data_date, stock_code, stock_name, weight, rank')
            .eq('etf_code', etfCode)
            .order('data_date', { ascending: true });

        const distinctDates = new Set((historyData ?? []).map(r => r.data_date)).size;
        if (distinctDates > 1) return (historyData ?? []).map(r => ({ ...r, stock_name: r.stock_name ?? '', weight: r.weight ?? 0 })) as RankingHistoryRow[];
    }

    const { data } = await supabase
        .from('etf_holdings_snapshot')
        .select('data_date, stock_code, stock_name, weight')
        .eq('etf_code', etfCode)
        .order('data_date', { ascending: true });

    if (!data || data.length === 0) return [];

    const byDate: Record<string, typeof data> = {};
    for (const row of data) {
        const d = row.data_date as string;
        if (!byDate[d]) byDate[d] = [];
        byDate[d].push(row);
    }

    const withRank: RankingHistoryRow[] = [];
    for (const rows of Object.values(byDate)) {
        const sorted = [...rows].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));
        sorted.forEach((row, i) => withRank.push({ ...row, stock_name: row.stock_name ?? '', weight: row.weight ?? 0, rank: i + 1 }));
    }
    return withRank;
}

export async function getEtfNews(etfCode: string): Promise<EtfNewsRow[]> {
    const supabase = await createClient();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 5);
    const { data } = await supabase
        .from('etf_news')
        .select('stock_code, pub_date, pub_time, title, source, url')
        .eq('etf_code', etfCode)
        .gte('pub_date', cutoff.toISOString().slice(0, 10))
        .order('pub_date', { ascending: false })
        .order('stock_code', { ascending: true });
    return (data ?? [])
        .filter(r => r.title && r.source)
        .map(r => ({ ...r, title: r.title!, source: r.source! })) as EtfNewsRow[];
}

export async function getDiffLogs(etfCode: string): Promise<DiffLogWithMeta[]> {
    const supabase = await createClient();

    const { data: logsData } = await supabase
        .from('etf_diff_logs')
        .select('id, etf_code, data_date, change_type, stock_code, stock_name, diff_shares, diff_weight, description, created_at, prev_shares, curr_shares, prev_weight, curr_weight, is_significant')
        .eq('etf_code', etfCode)
        .order('data_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(500);

    if (!logsData) return [];

    const uniqueDates = [...new Set(logsData.map(l => l.data_date))];
    const { data: snapshotData } = await supabase
        .from('etf_holdings_snapshot')
        .select('data_date, stock_code, weight')
        .in('data_date', uniqueDates)
        .eq('etf_code', etfCode);

    const dateRankMap: Record<string, Record<string, number>> = {};
    uniqueDates.forEach(date => {
        const dayHoldings = (snapshotData || [])
            .filter(s => s.data_date === date)
            .sort((a, b) => (b.weight || 0) - (a.weight || 0));
        dateRankMap[date] = {};
        dayHoldings.forEach((h, i) => { dateRankMap[date][h.stock_code] = i + 1; });
    });

    const { data: industryData } = await supabase
        .from('stock_basic_info')
        .select('stock_code, industry')
        .in('stock_code', logsData.map(l => l.stock_code));

    const industryMap: Record<string, string> = {};
    industryData?.forEach(i => { industryMap[i.stock_code] = i.industry; });

    return logsData.map(l => ({
        ...l,
        stock_name: l.stock_name ?? '',
        diff_shares: l.diff_shares ?? 0,
        diff_weight: l.diff_weight ?? 0,
        description: l.description ?? '',
        industry: industryMap[l.stock_code] || undefined,
        rank: dateRankMap[l.data_date]?.[l.stock_code] || null,
    })) as DiffLogWithMeta[];
}

export interface PnlSeriesPoint {
    data_date: string; total_pnl: number; total_cost: number; total_pnl_pct: number; total_shares: number;
}

export interface PositionItem {
    stock_code: string; data_date: string; cost_basis: number; mv_now: number; pnl: number; pnl_pct: number;
    delta_days: number; first_entry_date: string | null; entry_price: number | null; curr_price: number | null;
    curr_shares: number; is_active: boolean | null; exit_date: string | null; realized_pnl_pct: number | null;
}

export interface TodayDiffItem {
    etf_code: string; data_date: string; stock_code: string; stock_name: string | null; change_type: string;
    diff_shares: number | null; curr_shares: number | null; prev_shares: number | null;
    prev_weight: number | null; curr_weight: number | null; diff_weight: number | null; is_significant: boolean | null;
}

export interface EtfDrilldownPageData {
    pnlSeries: PnlSeriesPoint[];
    latestPositions: PositionItem[];
    todayDiffs: TodayDiffItem[];
    prevDate: string | null;
    prevDiffsForChart: DiffLog[];
}

export async function getEtfDrilldownPageData(etfCode: string, dataDate: string | null): Promise<EtfDrilldownPageData> {
    const supabase = await createClient();
    const [pnlResult, positionsResult, todayDiffsResult, prevDateResult] = await Promise.all([
        supabase.from('etf_pnl_series').select('data_date, total_mv, total_cost, total_pnl, total_pnl_pct, total_shares').eq('etf_code', etfCode).order('data_date', { ascending: true }).limit(365),
        supabase.from('etf_position_summary').select('stock_code, data_date, cost_basis, mv_now, pnl, pnl_pct, delta_days, first_entry_date, entry_price, curr_price, curr_shares, is_active, exit_date, realized_pnl_pct').eq('etf_code', etfCode).lte('data_date', dataDate ?? '').order('data_date', { ascending: false }).limit(500),
        supabase.from('etf_diff_logs').select('etf_code, data_date, stock_code, stock_name, change_type, diff_shares, curr_shares, prev_shares, prev_weight, curr_weight, diff_weight, is_significant').eq('etf_code', etfCode).eq('data_date', dataDate ?? '').order('diff_weight', { ascending: false }).limit(100),
        supabase.from('etf_diff_logs').select('data_date').eq('etf_code', etfCode).lt('data_date', dataDate ?? '').order('data_date', { ascending: false }).limit(1),
    ]);

    const seen = new Set<string>();
    const latestPositions: PositionItem[] = (positionsResult.data ?? [])
        .filter(p => !seen.has(p.stock_code) && !!seen.add(p.stock_code))
        .map(p => ({
            ...p,
            cost_basis: Number(p.cost_basis), mv_now: Number(p.mv_now), pnl: Number(p.pnl),
            pnl_pct: Number(p.pnl_pct), delta_days: p.delta_days ?? 0,
            entry_price: p.entry_price != null ? Number(p.entry_price) : null,
            curr_price: p.curr_price != null ? Number(p.curr_price) : null,
            curr_shares: Number(p.curr_shares),
            realized_pnl_pct: p.realized_pnl_pct != null ? Number(p.realized_pnl_pct) : null,
        }));

    const pnlSeries: PnlSeriesPoint[] = (pnlResult.data ?? []).map(r => ({
        data_date: r.data_date, total_pnl: Number(r.total_pnl), total_cost: Number(r.total_cost),
        total_pnl_pct: Number(r.total_pnl_pct), total_shares: Number(r.total_shares),
    }));

    const prevDate = prevDateResult.data?.[0]?.data_date ?? null;
    const prevDiffsRaw = prevDate
        ? (await supabase.from('etf_diff_logs').select('stock_code, stock_name, change_type, diff_shares').eq('etf_code', etfCode).eq('data_date', prevDate).in('change_type', ['BUY', 'IN']).not('diff_shares', 'is', null).limit(100)).data ?? []
        : [];
    const prevDiffsForChart: DiffLog[] = prevDiffsRaw.map(d => ({
        id: `${d.stock_code}-prev`, data_date: prevDate!, change_type: d.change_type as DiffLog['change_type'],
        stock_code: d.stock_code, stock_name: d.stock_name ?? '', diff_shares: d.diff_shares!, diff_weight: 0, description: '',
    }));

    return { pnlSeries, latestPositions, todayDiffs: (todayDiffsResult.data ?? []) as TodayDiffItem[], prevDate, prevDiffsForChart };
}
