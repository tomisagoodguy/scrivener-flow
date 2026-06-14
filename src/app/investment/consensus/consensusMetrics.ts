/**
 * 共識頁衍生欄位的純計算函式。
 * 皆以現有 etf_stock_overlap 資料即時計算，不依賴新欄位。
 */

/** 缺值 / 不可計算時的顯示符號。 */
const FALLBACK = '—';

/**
 * 覆蓋率 %：該股被多少比例的當日有資料 ETF 持有。
 * = 持有 ETF 數 ÷ 當日有持股資料的 ETF 數 × 100，一位小數。
 * 分母 ≤ 0 時回傳 fallback，不除以零。
 */
export function formatCoverage(etfCount: number, activeEtfCount: number): string {
    if (activeEtfCount <= 0) return FALLBACK;
    return `${((etfCount / activeEtfCount) * 100).toFixed(1)}%`;
}

/**
 * 平均 weight：對持有它的 ETF 而言平均佔多少權重。
 * = 合計權重 ÷ 持有 ETF 數，兩位小數。忽略各 ETF AUM 差異。
 * 持有 ETF 數 ≤ 0 時回傳 fallback，不除以零。
 */
export function formatAvgWeight(totalWeight: number, etfCount: number): string {
    if (etfCount <= 0) return FALLBACK;
    return `${(totalWeight / etfCount).toFixed(2)}%`;
}
