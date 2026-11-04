/**
 * 融資創一年新高說明卡：market_margin_regime_daily 型別與顯示純函式。
 * 統計由 pipeline MarginRegimeStep 每日重算（ETF/analysis/margin_regime.py）。
 */

export interface DrawdownGroup {
    n: number;
    /** 之後 60 個交易日內盤中曾跌一成的比例（小數） */
    dd10_rate: number | null;
    mean_ret60: number | null;
}

export interface DiffInterval {
    lo: number;
    hi: number;
}

export interface MarginRegimeStats {
    margin_high: DrawdownGroup;
    all: DrawdownGroup;
    index_high_only: DrawdownGroup;
    diff: {
        margin_high_vs_all: DiffInterval | null;
        margin_high_vs_index_high_only: DiffInterval | null;
    };
    /** 指數距一年高點 3% 內的比例 */
    shadow: { margin_high: number | null; all: number | null };
    sample_start: string | null;
    sample_end: string | null;
}

export interface MarginRegime {
    date: string;
    /** 上市＋上櫃融資金額（億元） */
    margin_balance: number;
    margin_1y_high: boolean;
    index_near_high: boolean;
    stats: Partial<MarginRegimeStats>;
}

export type DiffVerdict = 'higher' | 'lower' | 'indistinguishable' | 'insufficient';

/** 差距 95% 區間：完全在 0 之上＝較高、之下＝較低、跨零＝分不出高低 */
export function describeDiff(ci: DiffInterval | null | undefined): DiffVerdict {
    if (!ci) return 'insufficient';
    if (ci.lo > 0) return 'higher';
    if (ci.hi < 0) return 'lower';
    return 'indistinguishable';
}

export const VERDICT_WORDING: Record<DiffVerdict, string> = {
    higher: '顯著較高',
    lower: '顯著較低',
    indistinguishable: '分不出高低',
    insufficient: '樣本不足',
};

function signedPp(v: number): string {
    const s = (v * 100).toFixed(1);
    if (Number(s) === 0) return '0.0';
    return v > 0 ? `+${s}` : s;
}

export function formatPpInterval(ci: DiffInterval | null | undefined): string {
    return ci ? `${signedPp(ci.lo)} ～ ${signedPp(ci.hi)} pp` : '—';
}
