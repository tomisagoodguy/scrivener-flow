'use server';

import { createClient } from '@/lib/supabase/server';
import { ETF_CODES, getEtfMeta } from '@/lib/investment/etfRegistry';
import {
    buildDecompositionSeries,
    computeGrowthRanking,
    computeMechanicsAggregates,
    type AumMechanicsRow,
    type DecompositionPoint,
    type GrowthRankingRow,
    type MechanicsAggregates,
} from '@/lib/investment/mechanicsUtils';

export interface PremiumPoint {
    date: string;
    close: number | null;
    nav: number | null;
    premiumPct: number | null;
}

export interface EtfDividendRecord {
    period: string;
    cashPerUnit: number;
    exDate: string;
    payDate: string | null;
    yieldPct: number | null;
}

export interface EtfMechanicsData {
    etfCode: string;
    /** 是否有任何折溢價資料點（false → 前端顯示「NAV 來源未接」說明） */
    navConnected: boolean;
    premiumSeries: PremiumPoint[];
    dividends: EtfDividendRecord[];
    decomposition: DecompositionPoint[];
    aggregates: MechanicsAggregates;
}

export interface AumGrowthRankingRow extends GrowthRankingRow {
    etfName: string;
}

const AUM_COLUMNS = 'etf_code, data_date, aum_100m, nav, close, premium_pct, inflow, market_pnl';
const PAGE_SIZE = 1000;

function toNumberOrNull(v: unknown): number | null {
    if (v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

function toMechanicsRow(raw: Record<string, unknown>): AumMechanicsRow {
    return {
        etf_code: String(raw.etf_code ?? ''),
        data_date: String(raw.data_date ?? ''),
        aum_100m: toNumberOrNull(raw.aum_100m),
        nav: toNumberOrNull(raw.nav),
        close: toNumberOrNull(raw.close),
        premium_pct: toNumberOrNull(raw.premium_pct),
        inflow: toNumberOrNull(raw.inflow),
        market_pnl: toNumberOrNull(raw.market_pnl),
    };
}

/** 深潛頁「市場機制」Tab：折溢價序列 + 配息記錄 + 拆解序列 + 聚合指標，一次回傳。 */
export async function getEtfMechanics(etfCode: string): Promise<EtfMechanicsData> {
    const supabase = await createClient();

    const [aumRes, divRes] = await Promise.all([
        supabase
            .from('etf_aum_series')
            .select(AUM_COLUMNS)
            .eq('etf_code', etfCode)
            .order('data_date', { ascending: true })
            .range(0, PAGE_SIZE - 1),
        supabase
            .from('etf_dividend_records')
            .select('period, cash_per_unit, ex_date, pay_date, yield_pct')
            .eq('etf_code', etfCode)
            .order('ex_date', { ascending: true }),
    ]);

    if (aumRes.error) throw new Error(`etf_aum_series 查詢失敗: ${aumRes.error.message}`);
    if (divRes.error) throw new Error(`etf_dividend_records 查詢失敗: ${divRes.error.message}`);

    const rows = (aumRes.data ?? []).map((r) => toMechanicsRow(r as Record<string, unknown>));

    const premiumSeries: PremiumPoint[] = rows.map((r) => ({
        date: r.data_date,
        close: r.close,
        nav: r.nav,
        premiumPct: r.premium_pct,
    }));

    const dividends: EtfDividendRecord[] = (divRes.data ?? []).map((d) => {
        const raw = d as Record<string, unknown>;
        return {
            period: String(raw.period ?? ''),
            cashPerUnit: toNumberOrNull(raw.cash_per_unit) ?? 0,
            exDate: String(raw.ex_date ?? ''),
            payDate: raw.pay_date === null || raw.pay_date === undefined ? null : String(raw.pay_date),
            yieldPct: toNumberOrNull(raw.yield_pct),
        };
    });

    return {
        etfCode,
        navConnected: premiumSeries.some((p) => p.premiumPct !== null),
        premiumSeries,
        dividends,
        decomposition: buildDecompositionSeries(rows),
        aggregates: computeMechanicsAggregates(rows),
    };
}

/** compare 頁：全部 registry ETF 的申購占成長比排行（讀時聚合，不預存）。 */
export async function getAumGrowthRanking(): Promise<AumGrowthRankingRow[]> {
    const supabase = await createClient();

    const allRows: AumMechanicsRow[] = [];
    for (let page = 0; ; page++) {
        const { data, error } = await supabase
            .from('etf_aum_series')
            .select(AUM_COLUMNS)
            .in('etf_code', ETF_CODES)
            .order('etf_code', { ascending: true })
            .order('data_date', { ascending: true })
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (error) throw new Error(`etf_aum_series 查詢失敗: ${error.message}`);
        const batch = (data ?? []).map((r) => toMechanicsRow(r as Record<string, unknown>));
        allRows.push(...batch);
        if (batch.length < PAGE_SIZE) break;
    }

    return computeGrowthRanking(allRows).map((row) => ({
        ...row,
        etfName: getEtfMeta(row.etfCode)?.name ?? row.etfCode,
    }));
}
