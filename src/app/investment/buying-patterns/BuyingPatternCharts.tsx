'use client';

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    ResponsiveContainer,
    CartesianGrid,
} from 'recharts';
import type { PatternStats } from '@/app/actions/getBuyingPatternStats';

interface Props {
    stats: PatternStats[];
}

const HORIZONS = [1, 2, 3, 5, 7, 10, 15, 20, 25, 30];
const HEATMAP_HORIZONS = [1, 5, 10, 15, 20, 25, 30];
const MIN_SAMPLE = 10;

// 7 distinct colours for up to 7 pattern types
const PALETTE = [
    '#e11d48', '#f97316', '#eab308', '#22c55e',
    '#06b6d4', '#6366f1', '#a855f7',
];

function pctLabel(v: number) {
    return `${(v * 100).toFixed(2)}%`;
}

// Blue-to-red diverging scale (台股慣例：紅漲)
function heatColor(value: number | undefined): string {
    if (value === undefined) return '#e5e7eb';
    const clamped = Math.max(-0.15, Math.min(0.15, value));
    const t = (clamped + 0.15) / 0.30; // 0 = blue, 1 = red
    const r = Math.round(t * 220 + (1 - t) * 37);
    const g = Math.round(t * 38 + (1 - t) * 99);
    const b = Math.round(t * 38 + (1 - t) * 235);
    return `rgb(${r},${g},${b})`;
}

export default function BuyingPatternCharts({ stats }: Props) {
    if (stats.length === 0) {
        return (
            <div className="glass-card p-8 text-center text-gray-500">
                尚無足夠資料，請等待 Pipeline 累積事件後再查看。
            </div>
        );
    }

    // Build line chart data: [{day: 1, pattern_a: 0.01, ...}, ...]
    const lineData = HORIZONS.map((d) => {
        const point: Record<string, number | string> = { day: d };
        for (const s of stats) {
            const v = s.avgReturns[String(d)];
            if (v !== undefined) point[s.patternType] = v;
        }
        return point;
    });

    const winRateData = HORIZONS.map((d) => {
        const point: Record<string, number | string> = { day: d };
        for (const s of stats) {
            const v = s.winRates[String(d)];
            if (v !== undefined) point[s.patternType] = v;
        }
        return point;
    });

    return (
        <div className="space-y-8">
            {/* Chart 1: Average return line chart */}
            <section className="glass-card p-4">
                <h2 className="text-lg font-semibold mb-4">平均前瞻報酬（1–30 日）</h2>
                <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={lineData} margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="day" label={{ value: '交易日', position: 'insideBottom', offset: -4 }} />
                        <YAxis tickFormatter={pctLabel} />
                        <Tooltip formatter={(v: number | undefined) => v !== undefined ? pctLabel(v) : '—'} />
                        <Legend
                            formatter={(value) => {
                                const s = stats.find(p => p.patternType === value);
                                return `${value} (n=${s?.n ?? 0})`;
                            }}
                        />
                        {stats.map((s, i) => (
                            <Line
                                key={s.patternType}
                                type="monotone"
                                dataKey={s.patternType}
                                stroke={PALETTE[i % PALETTE.length]}
                                strokeWidth={s.n < MIN_SAMPLE ? 1.5 : 2}
                                strokeDasharray={s.n < MIN_SAMPLE ? '5 4' : undefined}
                                dot={false}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </section>

            {/* Chart 2: Heatmap */}
            <section className="glass-card p-4">
                <h2 className="text-lg font-semibold mb-4">平均報酬熱力圖（藍低→紅高）</h2>
                <div className="overflow-x-auto">
                    <table className="text-sm border-collapse w-full">
                        <thead>
                            <tr>
                                <th className="px-3 py-2 text-left font-medium text-gray-600">模式</th>
                                {HEATMAP_HORIZONS.map(d => (
                                    <th key={d} className="px-3 py-2 text-center font-medium text-gray-600">
                                        {d}日
                                    </th>
                                ))}
                                <th className="px-3 py-2 text-center font-medium text-gray-600">n</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.map((s) => (
                                <tr key={s.patternType} className={s.n < MIN_SAMPLE ? 'opacity-50' : ''}>
                                    <td className="px-3 py-2 font-mono text-xs">{s.patternType}</td>
                                    {HEATMAP_HORIZONS.map(d => {
                                        const val = s.avgReturns[String(d)];
                                        return (
                                            <td
                                                key={d}
                                                className="px-3 py-2 text-center text-white text-xs font-medium rounded"
                                                style={{ backgroundColor: heatColor(val) }}
                                            >
                                                {val !== undefined ? pctLabel(val) : '—'}
                                            </td>
                                        );
                                    })}
                                    <td className="px-3 py-2 text-center text-gray-500">{s.n}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Chart 3: Win-rate line chart */}
            <section className="glass-card p-4">
                <h2 className="text-lg font-semibold mb-4">勝率（1–30 日，return &gt; 0）</h2>
                <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={winRateData} margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="day" label={{ value: '交易日', position: 'insideBottom', offset: -4 }} />
                        <YAxis tickFormatter={pctLabel} domain={[0, 1]} />
                        <Tooltip formatter={(v: number | undefined) => v !== undefined ? pctLabel(v) : '—'} />
                        <Legend
                            formatter={(value) => {
                                const s = stats.find(p => p.patternType === value);
                                return `${value} (n=${s?.n ?? 0})`;
                            }}
                        />
                        {stats.map((s, i) => (
                            <Line
                                key={s.patternType}
                                type="monotone"
                                dataKey={s.patternType}
                                stroke={PALETTE[i % PALETTE.length]}
                                strokeWidth={s.n < MIN_SAMPLE ? 1.5 : 2}
                                strokeDasharray={s.n < MIN_SAMPLE ? '5 4' : undefined}
                                dot={false}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
                <p className="text-xs text-gray-400 mt-2">虛線 = 樣本數 &lt; {MIN_SAMPLE}</p>
            </section>
        </div>
    );
}
