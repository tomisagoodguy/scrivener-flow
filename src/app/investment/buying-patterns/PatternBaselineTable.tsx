import {
    PATTERN_LABELS,
    type HorizonComparison,
    type Interval,
    type PatternStats,
    type Verdict,
} from '@/lib/investment/buyingPatternStats';

interface Props {
    stats: PatternStats[];
}

const TABLE_HORIZONS = ['5', '10', '20'];

// 台股慣例：紅＝較好、綠＝較差
const VERDICT_STYLE: Record<Verdict, { label: string; className: string }> = {
    better: { label: '較好', className: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
    worse: { label: '較差', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    indistinguishable: { label: '分不出高低', className: 'bg-gray-500/10 text-gray-500 dark:text-gray-400' },
    insufficient: { label: '樣本不足', className: 'bg-gray-500/10 text-gray-500 dark:text-gray-400' },
};

function pct(v: number | null, digits = 1): string {
    return v === null ? '—' : `${(v * 100).toFixed(digits)}%`;
}

function pp(v: number): string {
    const s = (v * 100).toFixed(1);
    if (Number(s) === 0) return '0.0'; // 避免四捨五入出現 -0.0
    return v > 0 ? `+${s}` : s;
}

function interval(v: Interval | null): string {
    return v ? `${pp(v[0])} ～ ${pp(v[1])} pp` : '—';
}

function Row({ patternType, horizon, c }: { patternType: string; horizon: string; c: HorizonComparison }) {
    const verdict = VERDICT_STYLE[c.verdict];
    return (
        <tr data-testid={`baseline-row-${patternType}-${horizon}`} className="border-t border-gray-200/60">
            <td className="py-1.5 pr-3 tabular-nums">{horizon} 日</td>
            <td className="py-1.5 pr-3 text-right tabular-nums">{c.n}</td>
            <td className="py-1.5 pr-3 text-right tabular-nums">
                {pct(c.winRate)} <span className="text-gray-400">/ {pct(c.baselineWinRate)}</span>
            </td>
            <td className="py-1.5 pr-3 text-right tabular-nums">{interval(c.excessWin)}</td>
            <td className="py-1.5 pr-3 text-right tabular-nums">
                {pct(c.avgReturn, 2)} <span className="text-gray-400">/ {pct(c.baselineAvgReturn, 2)}</span>
            </td>
            <td className="py-1.5 pr-3 text-right tabular-nums">{interval(c.excessRet)}</td>
            <td className="py-1.5">
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${verdict.className}`}>{verdict.label}</span>
            </td>
        </tr>
    );
}

export default function PatternBaselineTable({ stats }: Props) {
    if (stats.length === 0) {
        return (
            <div className="glass-card p-6 text-center text-gray-500">
                與平常日比較的統計尚未計算，待每日 Pipeline 執行後顯示。
            </div>
        );
    }

    const { periodStart, periodEnd } = stats[0];

    return (
        <section className="glass-card p-4 overflow-x-auto">
            <h2 className="text-lg font-semibold mb-3">與平常日比較</h2>
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-left text-gray-500">
                        <th className="pb-2 pr-3 font-medium">天期</th>
                        <th className="pb-2 pr-3 font-medium text-right">樣本數</th>
                        <th className="pb-2 pr-3 font-medium text-right">勝率 / 平常日</th>
                        <th className="pb-2 pr-3 font-medium text-right">超額勝率 95% 區間</th>
                        <th className="pb-2 pr-3 font-medium text-right">平均報酬 / 平常日</th>
                        <th className="pb-2 pr-3 font-medium text-right">超額報酬 95% 區間</th>
                        <th className="pb-2 font-medium">判定</th>
                    </tr>
                </thead>
                {stats.map((s) => (
                    <tbody key={s.patternType}>
                        <tr>
                            <th colSpan={7} className="pt-3 pb-1 text-left font-semibold">
                                {PATTERN_LABELS[s.patternType] ?? s.patternType}
                                <span className="ml-2 text-xs font-normal text-gray-400">{s.patternType}</span>
                            </th>
                        </tr>
                        {TABLE_HORIZONS.filter((h) => s.byHorizon[h]).map((h) => (
                            <Row key={h} patternType={s.patternType} horizon={h} c={s.byHorizon[h]} />
                        ))}
                    </tbody>
                ))}
            </table>
            <p className="mt-3 text-xs text-gray-500 leading-relaxed">
                平常日＝同一批股票在 {periodStart}～{periodEnd} 每個交易日的前瞻報酬，口徑與事件相同（日曆天，目標日無價往後找 2 天）。
                95% 區間以 ISO 週為區塊、模式與平常日同組抽樣重抽 5,000 次；超額報酬區間完全在 0 之上才算較好、之下才算較差，跨零即與平常日分不出高低。
                樣本少於 30 筆或 8 週不計算區間。這是歷史統計，不代表未來。
            </p>
        </section>
    );
}
