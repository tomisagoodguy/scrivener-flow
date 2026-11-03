import type { TaiexClassStats, TaiexRegime } from '@/app/actions/getTaiexRegime';
import { CLASS_LABEL, STATE_LABEL, formatSignedPct, relevantBreakClass } from '@/lib/investment/taiexRegime';

interface Props {
    data: TaiexRegime | null;
}

interface MetricRow {
    label: string;
    render: (s: TaiexClassStats) => string;
}

const pct = (v: number | null) => (v == null ? '—' : `${Math.round(v * 100)}%`);
const count = (v: number | null, n: number) => (v == null ? '—' : `${v} / ${n}`);

const METRICS: MetricRow[] = [
    { label: '隔天收漲比例', render: (s) => pct(s.next_day_up_rate) },
    { label: '20 日後中位數', render: (s) => formatSignedPct(s.median_r20) },
    { label: '20 日後上漲比例', render: (s) => pct(s.up_rate_r20) },
    { label: '20 日內曾站回季線', render: (s) => count(s.back_above_within20, s.n) },
    { label: '20 日內盤中最低（中位數）', render: (s) => formatSignedPct(s.median_min_low20) },
    { label: '途中跌逾 5%', render: (s) => count(s.count_min_low_below_5pct, s.n) },
];

const fmt = (v: number | null) => (v == null ? '—' : Math.round(v).toLocaleString());

export default function TaiexRegimeCard({ data }: Props) {
    if (!data) {
        return <div className="glass-card p-4 rounded-xl text-sm text-gray-400">季線狀態尚未更新</div>;
    }

    const isAbove = data.state === 'above';
    const cls = relevantBreakClass(data.state, data.next_break_type);
    const classStats = cls ? data.stats[cls] : undefined;
    const baseline = data.stats.down_day;
    const stateColor = isAbove
        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';

    return (
        <div className="glass-card p-4 rounded-xl">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">大盤季線狀態</h3>
                <span className="text-xs text-gray-400">{data.date}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${stateColor}`}>
                    {STATE_LABEL[data.state]}
                </span>
                <span className="text-xs text-gray-500">
                    收盤 {fmt(data.close)} · 季線 {fmt(data.ma60)}（{data.ma_rising ? '上揚' : '下彎'}）
                </span>
            </div>

            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 mb-3">
                {isAbove && data.days_above != null && <li>站上季線 {data.days_above} 日</li>}
                {data.wave_break_count != null && (
                    <li>本波已跌破 {data.wave_break_count} 次（自最近一次「第一次跌破」起算）</li>
                )}
                {isAbove && data.next_break_threshold != null && cls && (
                    <li>
                        下一交易日收盤 ≤ {fmt(data.next_break_threshold)} 即跌破，屬「{CLASS_LABEL[cls]}」
                    </li>
                )}
            </ul>

            {cls && classStats && baseline && (
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="text-gray-500">
                                <th className="text-left font-normal py-1">歷史上同類事件</th>
                                <th className="text-right font-normal py-1">
                                    {CLASS_LABEL[cls]}
                                    <div>n = {classStats.n.toLocaleString()}</div>
                                </th>
                                <th className="text-right font-normal py-1">
                                    {CLASS_LABEL.down_day}
                                    <div>n = {baseline.n.toLocaleString()}</div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {METRICS.map((m) => (
                                <tr key={m.label} className="border-t border-gray-100 dark:border-gray-700">
                                    <td className="py-1 text-gray-600 dark:text-gray-400">{m.label}</td>
                                    <td className="py-1 text-right font-medium">{m.render(classStats)}</td>
                                    <td className="py-1 text-right text-gray-500">{m.render(baseline)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <p className="mt-3 text-xs text-gray-400">
                樣本 {classStats?.sample_start ?? '—'} ～ {classStats?.sample_end ?? '—'}；以指數收盤計，不含股利與成本。
                歷史統計，非預測或投資建議。
            </p>
        </div>
    );
}
