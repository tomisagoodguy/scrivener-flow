/**
 * 買進模式 vs 平常日基準統計：etf_buying_pattern_stats 列 → 頁面用的 PatternStats。
 * 統計由 pipeline BuyingPatternStep 每日重算（ETF/analysis/buying_pattern_stats.py）。
 */

export type Verdict = 'better' | 'worse' | 'indistinguishable' | 'insufficient';

/** 買進模式中文名稱（定義見 ETF/pipeline/steps/buying_pattern_step.py） */
export const PATTERN_LABELS: Record<string, string> = {
    new_position: '新倉建立',
    window_break: '長期突破',
    chase_high: '強勢追漲',
    dip_buy: '拉回買進',
    volume_spike: '爆量異常',
    sustained_buy: '持續買進',
};
export type Interval = [number, number];

export interface PatternStatsRow {
    pattern_type: string;
    horizon: number;
    n: number;
    n_weeks: number;
    win_rate: number | null;
    avg_return: number | null;
    baseline_n: number;
    baseline_win_rate: number | null;
    baseline_avg_return: number | null;
    excess_win_lo: number | null;
    excess_win_hi: number | null;
    excess_ret_lo: number | null;
    excess_ret_hi: number | null;
    period_start: string | null;
    period_end: string | null;
}

export interface HorizonComparison {
    n: number;
    winRate: number | null;
    avgReturn: number | null;
    baselineWinRate: number | null;
    baselineAvgReturn: number | null;
    excessWin: Interval | null;
    excessRet: Interval | null;
    verdict: Verdict;
}

export interface PatternStats {
    patternType: string;
    /** 各天期最大樣本數 */
    n: number;
    avgReturns: Record<string, number>;
    winRates: Record<string, number>;
    byHorizon: Record<string, HorizonComparison>;
    periodStart: string | null;
    periodEnd: string | null;
}

/** 以超額平均報酬 95% 區間判定：完全在 0 之上／之下才算較好／較差 */
export function classifyExcess(excessRet: Interval | null): Verdict {
    if (!excessRet) return 'insufficient';
    if (excessRet[0] > 0) return 'better';
    if (excessRet[1] < 0) return 'worse';
    return 'indistinguishable';
}

function toInterval(lo: number | null, hi: number | null): Interval | null {
    return lo === null || hi === null ? null : [lo, hi];
}

export function toPatternStats(rows: PatternStatsRow[]): PatternStats[] {
    const byPattern = new Map<string, PatternStats>();
    for (const r of rows) {
        let stats = byPattern.get(r.pattern_type);
        if (!stats) {
            stats = {
                patternType: r.pattern_type,
                n: 0,
                avgReturns: {},
                winRates: {},
                byHorizon: {},
                periodStart: r.period_start,
                periodEnd: r.period_end,
            };
            byPattern.set(r.pattern_type, stats);
        }
        const key = String(r.horizon);
        stats.n = Math.max(stats.n, r.n);
        if (r.avg_return !== null) stats.avgReturns[key] = r.avg_return;
        if (r.win_rate !== null) stats.winRates[key] = r.win_rate;
        const excessRet = toInterval(r.excess_ret_lo, r.excess_ret_hi);
        stats.byHorizon[key] = {
            n: r.n,
            winRate: r.win_rate,
            avgReturn: r.avg_return,
            baselineWinRate: r.baseline_win_rate,
            baselineAvgReturn: r.baseline_avg_return,
            excessWin: toInterval(r.excess_win_lo, r.excess_win_hi),
            excessRet,
            verdict: classifyExcess(excessRet),
        };
    }
    return [...byPattern.values()];
}
