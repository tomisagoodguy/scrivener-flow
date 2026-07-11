/**
 * ETF 市場機制純函式（etf-market-mechanics）
 *
 * AUM 成長拆解聚合：growth_mult / inflow_share_of_growth / top flow days
 * 皆為讀時聚合（Server Action 呼叫），不預存快照。
 * 指標為近似值：units 由 AUM/NAV 推算（與 ETF pipeline 同口徑）。
 */

/** etf_aum_series 一列（市場機制相關欄位） */
export interface AumMechanicsRow {
    etf_code: string;
    data_date: string;
    aum_100m: number | null;
    nav: number | null;
    close: number | null;
    premium_pct: number | null;
    inflow: number | null;
    market_pnl: number | null;
}

export interface DecompositionPoint {
    date: string;
    inflow: number | null;
    marketPnl: number | null;
    cumInflow: number;
    cumMarketPnl: number;
}

export interface FlowDay {
    date: string;
    value: number;
}

export interface MechanicsAggregates {
    growthMult: number | null;
    inflowShareOfGrowth: number | null;
    topInflowDay: FlowDay | null;
    topOutflowDay: FlowDay | null;
}

export interface GrowthRankingRow {
    etfCode: string;
    aumCurrent: number | null;
    growthMult: number | null;
    inflowShareOfGrowth: number | null;
    cumInflow: number;
    aumGrowth: number | null;
}

/** 依日期序累計 inflow / market_pnl（null 視為 0，不中斷累計）。rows 需已按日期排序。 */
export function buildDecompositionSeries(rows: AumMechanicsRow[]): DecompositionPoint[] {
    let cumInflow = 0;
    let cumMarketPnl = 0;
    return rows.map((r) => {
        cumInflow += r.inflow ?? 0;
        cumMarketPnl += r.market_pnl ?? 0;
        return {
            date: r.data_date,
            inflow: r.inflow,
            marketPnl: r.market_pnl,
            cumInflow,
            cumMarketPnl,
        };
    });
}

/** 讀時聚合指標。rows 需已按日期排序且屬同一 ETF。 */
export function computeMechanicsAggregates(rows: AumMechanicsRow[]): MechanicsAggregates {
    const withAum = rows.filter((r) => r.aum_100m !== null);
    if (withAum.length === 0) {
        return { growthMult: null, inflowShareOfGrowth: null, topInflowDay: null, topOutflowDay: null };
    }

    const aumFirst = withAum[0].aum_100m as number;
    const aumCurrent = withAum[withAum.length - 1].aum_100m as number;
    const growthMult = aumFirst > 0 ? aumCurrent / aumFirst : null;

    const cumInflow = rows.reduce((sum, r) => sum + (r.inflow ?? 0), 0);
    const growth = aumCurrent - aumFirst;
    const inflowShareOfGrowth = growth > 0 ? cumInflow / growth : null;

    let topInflowDay: FlowDay | null = null;
    let topOutflowDay: FlowDay | null = null;
    for (const r of rows) {
        if (r.inflow === null) continue;
        if (r.inflow > 0 && (topInflowDay === null || r.inflow > topInflowDay.value)) {
            topInflowDay = { date: r.data_date, value: r.inflow };
        }
        if (r.inflow < 0 && (topOutflowDay === null || r.inflow < topOutflowDay.value)) {
            topOutflowDay = { date: r.data_date, value: r.inflow };
        }
    }

    return { growthMult, inflowShareOfGrowth, topInflowDay, topOutflowDay };
}

/** 跨 ETF 申購占成長比排行（rows 可含多 ETF，需已按日期排序）。 */
export function computeGrowthRanking(rows: AumMechanicsRow[]): GrowthRankingRow[] {
    const byEtf = new Map<string, AumMechanicsRow[]>();
    for (const r of rows) {
        const list = byEtf.get(r.etf_code);
        if (list) {
            list.push(r);
        } else {
            byEtf.set(r.etf_code, [r]);
        }
    }

    const ranking: GrowthRankingRow[] = [];
    for (const [etfCode, series] of byEtf) {
        const agg = computeMechanicsAggregates(series);
        const withAum = series.filter((r) => r.aum_100m !== null);
        const aumFirst = withAum.length > 0 ? (withAum[0].aum_100m as number) : null;
        const aumCurrent = withAum.length > 0 ? (withAum[withAum.length - 1].aum_100m as number) : null;
        ranking.push({
            etfCode,
            aumCurrent,
            growthMult: agg.growthMult,
            inflowShareOfGrowth: agg.inflowShareOfGrowth,
            cumInflow: series.reduce((sum, r) => sum + (r.inflow ?? 0), 0),
            aumGrowth: aumCurrent !== null && aumFirst !== null ? aumCurrent - aumFirst : null,
        });
    }
    return ranking;
}
