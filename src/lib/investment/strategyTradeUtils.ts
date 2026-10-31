/**
 * 策略換股後表現：型別與彙總純函式（資料來源 strategy_trades，報酬已由 pipeline 預算）。
 * 報酬為小數（0.07 = 7%）；持有中＝exitDate 為 null；待進場＝entryDate 為 null。
 */

export interface StrategyTrade {
    strategyId: string;
    stockId: string;
    name: string | null;
    industry: string | null;
    entrySignalDate: string;
    entryDate: string | null;
    entryPrice: number | null;
    exitDate: string | null;
    exitPrice: number | null;
    latestDate: string | null;
    holdingReturn: number | null;
    postExitReturn: number | null;
}

export interface TradeSummary {
    /** 持有中且報酬非 null 的檔數 */
    openCount: number;
    avgReturn: number | null;
    /** 報酬 > 0 的檔數 ÷ openCount */
    winRate: number | null;
    /** 近 60 天換出檔數 */
    exitCount: number;
    avgPostExitReturn: number | null;
    pending: StrategyTrade[];
}

export interface IndustryGroup {
    industry: string;
    count: number;
    avgReturn: number;
    positive: number;
    negative: number;
}

export const RECENT_EXIT_DAYS = 60;
export const UNCLASSIFIED_INDUSTRY = '未分類';

const DAY_MS = 86_400_000;

function daysBetween(from: string, to: string): number {
    return Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);
}

function average(values: number[]): number | null {
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

const isPending = (t: StrategyTrade): boolean => t.entryDate === null;

/** 持有中、已進場且報酬非 null（統計與分欄的母體） */
function scoredOpen(trades: StrategyTrade[]): (StrategyTrade & { holdingReturn: number })[] {
    return trades.filter(
        (t): t is StrategyTrade & { holdingReturn: number } =>
            t.exitDate === null && !isPending(t) && t.holdingReturn !== null,
    );
}

/** 近 days 天（含第 days 天）出場者，依出場日遞減 */
export function recentExits(trades: StrategyTrade[], asOf: string, days: number = RECENT_EXIT_DAYS): StrategyTrade[] {
    return trades
        .filter((t) => t.exitDate !== null && daysBetween(t.exitDate, asOf) <= days)
        .sort((a, b) => (b.exitDate ?? '').localeCompare(a.exitDate ?? ''));
}

export function summarizeTrades(trades: StrategyTrade[], asOf: string): TradeSummary {
    const open = scoredOpen(trades);
    const returns = open.map((t) => t.holdingReturn);
    const exits = recentExits(trades, asOf);
    const postExit = exits.map((t) => t.postExitReturn).filter((v): v is number => v !== null);

    return {
        openCount: open.length,
        avgReturn: average(returns),
        winRate: open.length ? returns.filter((r) => r > 0).length / open.length : null,
        exitCount: exits.length,
        avgPostExitReturn: average(postExit),
        pending: trades.filter((t) => t.exitDate === null && isPending(t)),
    };
}

/** 持有中個股分成正報酬（> 0，遞減）與負報酬（≤ 0，遞增） */
export function splitByReturn(trades: StrategyTrade[]): { positive: StrategyTrade[]; negative: StrategyTrade[] } {
    const open = scoredOpen(trades);
    return {
        positive: open.filter((t) => t.holdingReturn > 0).sort((a, b) => b.holdingReturn - a.holdingReturn),
        negative: open.filter((t) => t.holdingReturn <= 0).sort((a, b) => a.holdingReturn - b.holdingReturn),
    };
}

/** 持有中個股依產業彙總，依平均報酬遞減 */
export function groupByIndustry(trades: StrategyTrade[]): IndustryGroup[] {
    const buckets = new Map<string, number[]>();
    for (const t of scoredOpen(trades)) {
        const key = t.industry || UNCLASSIFIED_INDUSTRY;
        const list = buckets.get(key) ?? [];
        list.push(t.holdingReturn);
        buckets.set(key, list);
    }
    return [...buckets.entries()]
        .map(([industry, rets]) => ({
            industry,
            count: rets.length,
            avgReturn: average(rets) ?? 0,
            positive: rets.filter((r) => r > 0).length,
            negative: rets.filter((r) => r <= 0).length,
        }))
        .sort((a, b) => b.avgReturn - a.avgReturn);
}

/** 進場日到最新資料日的日曆天數 */
export function holdingDays(t: StrategyTrade): number | null {
    return t.entryDate && t.latestDate ? daysBetween(t.entryDate, t.latestDate) : null;
}

/** 小數報酬 → 百分比字串（0.1 → '10.00%'）；null → '—' */
export function formatReturnPct(value: number | null, digits: number = 2): string {
    return value === null ? '—' : `${(value * 100).toFixed(digits)}%`;
}

/** 台股紅漲綠跌；0 與 null 為灰色 */
export function returnColorClass(value: number | null): string {
    if (value === null || value === 0) return 'text-gray-500 dark:text-gray-400';
    return value > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400';
}
