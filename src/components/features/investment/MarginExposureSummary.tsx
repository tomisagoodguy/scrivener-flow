import type { MarginExposureSummary as Summary } from '@/lib/investment/marginRisk';

interface Props {
    summary: Summary;
    /** ETF 持股頁顯示權重合計；自選股無權重 */
    showWeight: boolean;
}

/** 一行高融資曝險摘要：持股中屬當日全市場融資使用率前 20% 的檔數（與權重）。 */
export function MarginExposureSummary({ summary, showWeight }: Props) {
    return (
        <div
            className="glass-card rounded-lg px-4 py-2 text-sm text-slate-600 dark:text-slate-300"
            title="融資使用率在當日全市場合格股（四碼普通股、20 日均額 ≥ 5 千萬、收盤 ≥ 10 元）中排名前 20%"
        >
            <span>
                高融資前 20%：
                <span className="font-bold text-amber-700 dark:text-amber-300">{summary.highCount} 檔</span>
                {showWeight && `（權重 ${summary.highWeight.toFixed(1)}%）`}
            </span>
            {summary.unknownCount > 0 && (
                <span className="ml-2 text-xs text-slate-400">另 {summary.unknownCount} 檔無資料</span>
            )}
        </div>
    );
}
