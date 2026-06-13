import { createClient } from '@/lib/supabase/server';
import { ETF_REGISTRY, ETF_CODES, EtfRegistryEntry } from '@/lib/investment/etfRegistry';

export interface EtfOverviewStat {
    code: string;
    shortCode: string;
    name: string;
    manager: string;
    color: string;
    /** 該 ETF 自己的最新揭露日（非全局日期）；無 snapshot 資料時為 null */
    dataDate: string | null;
    holdingsCount: number;
    nav: number | null;
    aum100m: number | null;
    /** IN */
    added: number;
    /** OUT */
    removed: number;
    /** BUY */
    increased: number;
    /** SELL */
    decreased: number;
}

/** 每支 ETF 的最新揭露日與該日持股檔數（由逐 ETF 查詢預先聚合） */
export interface EtfDailySummary {
    etf_code: string;
    data_date: string | null;
    holdings_count: number;
}

interface AumRow {
    etf_code: string;
    data_date: string;
    nav: number | null;
    aum_100m: number | null;
}

interface DiffRow {
    etf_code: string;
    data_date: string;
    change_type: string;
}

export function buildOverviewStats(
    registry: EtfRegistryEntry[],
    dailyRows: EtfDailySummary[],
    aumRows: AumRow[],
    diffRows: DiffRow[],
): EtfOverviewStat[] {
    const dailyByEtf: Record<string, EtfDailySummary> = {};
    for (const row of dailyRows) {
        dailyByEtf[row.etf_code] = row;
    }

    // 各 ETF 最新一筆 AUM/NAV
    const latestAumByEtf: Record<string, AumRow> = {};
    for (const row of aumRows) {
        const current = latestAumByEtf[row.etf_code];
        if (!current || row.data_date > current.data_date) {
            latestAumByEtf[row.etf_code] = row;
        }
    }

    // 異動計數：只計入該 ETF 自身揭露日當日的紀錄
    const diffCounts: Record<string, { added: number; removed: number; increased: number; decreased: number }> = {};
    for (const row of diffRows) {
        if (!row.data_date || row.data_date !== dailyByEtf[row.etf_code]?.data_date) continue;
        const counts = diffCounts[row.etf_code] ?? { added: 0, removed: 0, increased: 0, decreased: 0 };
        if (row.change_type === 'IN') counts.added += 1;
        else if (row.change_type === 'OUT') counts.removed += 1;
        else if (row.change_type === 'BUY') counts.increased += 1;
        else if (row.change_type === 'SELL') counts.decreased += 1;
        diffCounts[row.etf_code] = counts;
    }

    return registry.map(entry => {
        const daily = dailyByEtf[entry.code];
        const aum = latestAumByEtf[entry.code];
        const counts = diffCounts[entry.code] ?? { added: 0, removed: 0, increased: 0, decreased: 0 };
        return {
            code: entry.code,
            shortCode: entry.shortCode,
            name: entry.name,
            manager: entry.manager,
            color: entry.color,
            dataDate: daily?.data_date ?? null,
            holdingsCount: daily?.holdings_count ?? 0,
            nav: aum?.nav ?? null,
            aum100m: aum?.aum_100m ?? null,
            ...counts,
        };
    });
}

/**
 * 逐 ETF 小查詢，避免 PostgREST 單次 1000 列上限截斷批次查詢
 * （近 14 天 snapshot 約 8000 列、diff 約 1300 列，批次撈取會被靜默截斷）。
 */
export async function getEtfOverviewStats(): Promise<EtfOverviewStat[]> {
    const supabase = await createClient();

    const aumPromise = supabase
        .from('etf_aum_series')
        .select('etf_code, data_date, nav, aum_100m')
        .in('etf_code', ETF_CODES)
        .order('data_date', { ascending: false })
        .limit(ETF_CODES.length * 3);

    const perEtf = await Promise.all(
        ETF_CODES.map(async etfCode => {
            const { data: dateRow } = await supabase
                .from('etf_holdings_snapshot')
                .select('data_date')
                .eq('etf_code', etfCode)
                .order('data_date', { ascending: false })
                .limit(1);

            const dataDate: string | null = dateRow?.[0]?.data_date ?? null;
            if (!dataDate) {
                return {
                    daily: { etf_code: etfCode, data_date: null, holdings_count: 0 },
                    diffRows: [] as DiffRow[],
                };
            }

            const [countRes, diffRes] = await Promise.all([
                supabase
                    .from('etf_holdings_snapshot')
                    .select('etf_code', { count: 'exact', head: true })
                    .eq('etf_code', etfCode)
                    .eq('data_date', dataDate),
                supabase
                    .from('etf_diff_logs')
                    .select('etf_code, data_date, change_type')
                    .eq('etf_code', etfCode)
                    .eq('data_date', dataDate),
            ]);

            return {
                daily: { etf_code: etfCode, data_date: dataDate, holdings_count: countRes.count ?? 0 },
                diffRows: (diffRes.data ?? []) as DiffRow[],
            };
        }),
    );

    const aumRes = await aumPromise;

    return buildOverviewStats(
        ETF_REGISTRY,
        perEtf.map(p => p.daily),
        (aumRes.data ?? []) as AumRow[],
        perEtf.flatMap(p => p.diffRows),
    );
}
