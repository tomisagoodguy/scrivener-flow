import type { EquityRow, RankingData, SortDir, SortKey, Tier, Weeks } from '@/lib/investment/equityPageData';

/** 籌碼排行圖表視角可切換的清單（URL 參數 `list`） */
export type EquityChartList = 'double' | 'big' | 'retail';

/** 主力買進 / 散戶減少圖表各取前 N 名；必須與 ETF/pipeline/steps/sync_bare_k_step.py 的 EQUITY_LIST_LIMIT 一致 */
export const EQUITY_CHART_LIST_LIMIT = 30;

const CHART_LISTS: readonly EquityChartList[] = ['double', 'big', 'retail'];

/** 缺省或不合法的 `list` 一律視為雙訊號 */
export function parseEquityChartList(raw: string | undefined): EquityChartList {
    return CHART_LISTS.find((l) => l === raw) ?? 'double';
}

/** 視角 / 清單切換時要保留的排行參數；只放非預設值 */
export function equityBaseParams(tier: Tier | null, weeks: Weeks, sort: SortKey | null, dir: SortDir): Record<string, string> {
    const params: Record<string, string> = {};
    if (tier) params.tier = tier;
    if (weeks !== 1) params.weeks = String(weeks);
    if (sort) {
        params.sort = sort;
        params.dir = dir;
    }
    return params;
}

/** `/investment/equity` 加上參數；無參數時不帶 `?` */
export function equityHref(params: Record<string, string>): string {
    const qs = new URLSearchParams(params).toString();
    return qs ? `/investment/equity?${qs}` : '/investment/equity';
}

/** 依清單取圖表列，順序沿用排行結果（已套用 tier / weeks / sort） */
export function selectEquityChartRows(data: RankingData, list: EquityChartList): EquityRow[] {
    if (list === 'double') return data.doubleSignalRanking;
    const source = list === 'big' ? data.bigHolderRanking : data.retailDeclineRanking;
    return source.slice(0, EQUITY_CHART_LIST_LIMIT);
}

type HolderChangeField = 'big_holder_pct_change' | 'mid_holder_pct_change' | 'whale_holder_pct_change';

/** 級距 → 大戶變化欄位與標籤，與排行頁 changeField 對應一致 */
function holderField(tier: Tier | null): { field: HolderChangeField; label: string } {
    if (tier === '200') return { field: 'mid_holder_pct_change', label: '200張+' };
    if (tier === '1000') return { field: 'whale_holder_pct_change', label: '1000張+' };
    return { field: 'big_holder_pct_change', label: '400張+' };
}

function signed(value: number): string {
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}`;
}

/** 「400張+大戶 +0.85pp・股東 -2.30%」；null 的部分連同分隔符省略 */
export function formatEquityHeader(row: EquityRow, tier: Tier | null): string {
    const { field, label } = holderField(tier);
    const parts: string[] = [];
    const holder = row[field];
    if (holder !== null) parts.push(`${label}大戶 ${signed(holder)}pp`);
    if (row.shareholders_change_rate !== null) parts.push(`股東 ${signed(row.shareholders_change_rate)}%`);
    return parts.join('・');
}
