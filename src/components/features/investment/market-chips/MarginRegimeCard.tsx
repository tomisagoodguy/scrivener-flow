import {
    VERDICT_WORDING,
    describeDiff,
    formatPpInterval,
    type DrawdownGroup,
    type MarginRegime,
} from '@/lib/investment/marginRegime';

interface MarginRegimeCardProps {
    data: MarginRegime | null;
}

const pct = (v: number | null | undefined) => (v == null ? '—' : `${Math.round(v * 100)}%`);
const signedPct = (v: number | null | undefined) =>
    v == null ? '—' : `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`;

const GROUPS: Array<{ key: 'margin_high' | 'index_high_only' | 'all'; label: string }> = [
    { key: 'margin_high', label: '融資創一年新高' },
    { key: 'index_high_only', label: '指數創一年新高、融資沒創高' },
    { key: 'all', label: '平常日（全部交易日）' },
];

// 融資創高不是訊號：只用中性灰，不用台股紅綠
const LABEL_CLASS = 'px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-500/10 text-gray-600 dark:text-gray-300';

export function MarginRegimeCard({ data }: MarginRegimeCardProps) {
    if (!data) {
        return <div className="mt-4 text-sm text-slate-400">融資狀態尚未更新</div>;
    }

    const { stats } = data;
    const diff = stats.diff?.margin_high_vs_all ?? null;
    const verdict = describeDiff(diff);

    return (
        <div className="mt-4 border-t border-slate-200/60 dark:border-slate-700 pt-4 text-sm">
            <div className="flex flex-wrap items-center gap-2 mb-3">
                <span data-testid="margin-high-label" className={LABEL_CLASS}>{data.margin_1y_high ? '融資創一年新高' : '未創一年新高'}</span>
                <span className="text-xs text-slate-500">
                    {data.date} 融資餘額 {Math.round(data.margin_balance).toLocaleString()} 億（上市＋上櫃）
                </span>
            </div>

            <table className="w-full text-xs mb-3">
                <thead>
                    <tr className="text-slate-500">
                        <th className="text-left font-normal py-1">歷史上的日子</th>
                        <th className="text-right font-normal py-1">天數</th>
                        <th className="text-right font-normal py-1">之後 60 日內曾跌一成</th>
                        <th className="text-right font-normal py-1">60 日平均報酬</th>
                    </tr>
                </thead>
                <tbody>
                    {GROUPS.map(({ key, label }) => {
                        const g: DrawdownGroup | undefined = stats[key];
                        return (
                            <tr key={key} data-testid={`group-${key}`} className="border-t border-slate-100 dark:border-slate-700">
                                <td className="py-1 text-slate-600 dark:text-slate-400">{label}</td>
                                <td className="py-1 text-right tabular-nums">{g ? g.n.toLocaleString() : '—'}</td>
                                <td className="py-1 text-right tabular-nums font-medium">{pct(g?.dd10_rate)}</td>
                                <td className="py-1 text-right tabular-nums">{signedPct(g?.mean_ret60)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            <ul className="space-y-1 text-slate-700 dark:text-slate-300">
                <li data-testid="margin-high-conclusion">
                    {verdict === 'insufficient'
                        ? '融資創一年新高的樣本不足，無法與平常日比較。'
                        : `融資創一年新高之後跌一成的比例，跟平常日相比${VERDICT_WORDING[verdict]}（差距 95% 區間 ${formatPpInterval(diff)}）。`}
                    融資創新高不是賣的理由，也不是安全的理由。
                </li>
                <li data-testid="margin-shadow">
                    融資創高的日子，{pct(stats.shadow?.margin_high)} 指數離一年高點不到 3%（平常日 {pct(stats.shadow?.all)}）：
                    融資高點多半只是股價高點的影子。
                </li>
            </ul>

            <p className="mt-3 text-xs text-slate-400">
                樣本 {stats.sample_start ?? '—'}～{stats.sample_end ?? '—'}；跌一成＝之後 60 個交易日內加權指數盤中最低比當天收盤低 10% 以上，
                區間以月份為區塊重抽 5,000 次。融資金額口徑為 FinLab 上市＋上櫃融資金額，與上方圖表的 TWSE 數字可能略有差異。
                歷史統計，非預測或投資建議。
            </p>
        </div>
    );
}
