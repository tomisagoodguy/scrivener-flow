import {
    buildDecompositionSeries,
    computeMechanicsAggregates,
    computeGrowthRanking,
    type AumMechanicsRow,
} from '../mechanicsUtils';

function row(partial: Partial<AumMechanicsRow> & { data_date: string }): AumMechanicsRow {
    return {
        etf_code: '00981A',
        aum_100m: null,
        nav: null,
        close: null,
        premium_pct: null,
        inflow: null,
        market_pnl: null,
        ...partial,
    };
}

describe('buildDecompositionSeries', () => {
    it('累計 inflow 與 market_pnl（null 視為 0，不中斷累計）', () => {
        const series = buildDecompositionSeries([
            row({ data_date: '2026-07-01', aum_100m: 100, inflow: null, market_pnl: null }),
            row({ data_date: '2026-07-02', aum_100m: 107, inflow: 5.1, market_pnl: 2.0 }),
            row({ data_date: '2026-07-03', aum_100m: 108, inflow: -1.0, market_pnl: 2.5 }),
        ]);
        expect(series).toHaveLength(3);
        expect(series[0].cumInflow).toBeCloseTo(0);
        expect(series[1].cumInflow).toBeCloseTo(5.1);
        expect(series[2].cumInflow).toBeCloseTo(4.1);
        expect(series[2].cumMarketPnl).toBeCloseTo(4.5);
    });
});

describe('computeMechanicsAggregates', () => {
    const rows = [
        row({ data_date: '2026-07-01', aum_100m: 100 }),
        row({ data_date: '2026-07-02', aum_100m: 107, inflow: 5.1, market_pnl: 2.0 }),
        row({ data_date: '2026-07-03', aum_100m: 110, inflow: -1.0, market_pnl: 2.5 }),
        row({ data_date: '2026-07-04', aum_100m: 120, inflow: 8.0, market_pnl: 1.0 }),
    ];

    it('growth_mult = aum_current / aum_first', () => {
        const agg = computeMechanicsAggregates(rows);
        expect(agg.growthMult).toBeCloseTo(1.2);
    });

    it('inflow_share_of_growth = 累計 inflow / 總 AUM 成長', () => {
        const agg = computeMechanicsAggregates(rows);
        // cum inflow = 12.1，growth = 20
        expect(agg.inflowShareOfGrowth).toBeCloseTo(12.1 / 20);
    });

    it('top inflow / outflow day', () => {
        const agg = computeMechanicsAggregates(rows);
        expect(agg.topInflowDay).toEqual({ date: '2026-07-04', value: 8.0 });
        expect(agg.topOutflowDay).toEqual({ date: '2026-07-03', value: -1.0 });
    });

    it('AUM 未成長 → inflowShareOfGrowth null；無負 inflow → topOutflowDay null', () => {
        const flat = [
            row({ data_date: '2026-07-01', aum_100m: 100 }),
            row({ data_date: '2026-07-02', aum_100m: 100, inflow: 1.0 }),
        ];
        const agg = computeMechanicsAggregates(flat);
        expect(agg.inflowShareOfGrowth).toBeNull();
        expect(agg.topOutflowDay).toBeNull();
        expect(agg.topInflowDay).toEqual({ date: '2026-07-02', value: 1.0 });
    });

    it('空序列 → 全 null', () => {
        const agg = computeMechanicsAggregates([]);
        expect(agg.growthMult).toBeNull();
        expect(agg.inflowShareOfGrowth).toBeNull();
        expect(agg.topInflowDay).toBeNull();
        expect(agg.topOutflowDay).toBeNull();
    });
});

describe('computeGrowthRanking', () => {
    it('依 etf_code 分組聚合並可供排序', () => {
        const rows = [
            row({ etf_code: '00981A', data_date: '2026-07-01', aum_100m: 100 }),
            row({ etf_code: '00981A', data_date: '2026-07-02', aum_100m: 120, inflow: 15 }),
            row({ etf_code: '00984D', data_date: '2026-07-01', aum_100m: 50 }),
            row({ etf_code: '00984D', data_date: '2026-07-02', aum_100m: 60, inflow: 2 }),
        ];
        const ranking = computeGrowthRanking(rows);
        expect(ranking).toHaveLength(2);
        const a = ranking.find((r) => r.etfCode === '00981A');
        const d = ranking.find((r) => r.etfCode === '00984D');
        expect(a?.inflowShareOfGrowth).toBeCloseTo(15 / 20);
        expect(a?.growthMult).toBeCloseTo(1.2);
        expect(a?.aumCurrent).toBeCloseTo(120);
        expect(d?.inflowShareOfGrowth).toBeCloseTo(2 / 10);
    });

    it('單日資料（無成長基期）→ 該 ETF 指標為 null 但仍出現在排行', () => {
        const ranking = computeGrowthRanking([
            row({ etf_code: '00997A', data_date: '2026-07-01', aum_100m: 30 }),
        ]);
        expect(ranking).toHaveLength(1);
        expect(ranking[0].inflowShareOfGrowth).toBeNull();
        expect(ranking[0].growthMult).toBeCloseTo(1);
    });
});
