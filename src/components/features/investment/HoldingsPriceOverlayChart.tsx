'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

type Period = '30' | '60' | '90';

interface WeightPoint {
    date: string;
    weight: number;
    etf_code: string;
}

interface PricePoint {
    date: string;
    close: number;
}

interface Props {
    stockCode: string;
    etfCodes: string[];
    etfColors: Record<string, string>;
}

// ── 簡易 SVG 折線圖 ───────────────────────────────────────────────────────────

function normalise(vals: number[]): number[] {
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    return vals.map(v => (v - min) / range);
}

function buildPath(points: { x: number; y: number }[], W: number, H: number): string {
    return points
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x * W} ${(1 - p.y) * H}`)
        .join(' ');
}

const MAX_ETF_LINES = 5;

function MiniChart({
    weightSeries,
    priceSeries,
    etfColors,
}: {
    weightSeries: WeightPoint[][];
    priceSeries: PricePoint[];
    etfColors: Record<string, string>;
}) {
    const W = 600;
    const H = 120;
    const allDates = [...new Set([
        ...weightSeries.flat().map(p => p.date),
        ...priceSeries.map(p => p.date),
    ])].sort();

    if (!allDates.length) return <p className="text-xs text-slate-400 text-center py-4">暫無圖表資料</p>;

    const dateIdx = Object.fromEntries(allDates.map((d, i) => [d, i]));
    const len = allDates.length;

    // 按最新比重排序，只顯示前 MAX_ETF_LINES 支
    const sorted = [...weightSeries]
        .filter(s => s.length > 0)
        .sort((a, b) => (b[b.length - 1]?.weight ?? 0) - (a[a.length - 1]?.weight ?? 0))
        .slice(0, MAX_ETF_LINES);

    // 所有 ETF 比重共用一組 min/max，讓高比重的線真的在高位
    const allWeights = sorted.flatMap(s => s.map(p => p.weight));
    const sharedMin = Math.min(...allWeights);
    const sharedMax = Math.max(...allWeights);
    const sharedRange = sharedMax - sharedMin || 1;
    const normShared = (v: number) => (v - sharedMin) / sharedRange;

    const priceNorm = normalise(priceSeries.map(p => p.close));
    const pricePath = buildPath(
        priceSeries.map((p, i) => ({ x: dateIdx[p.date] / (len - 1 || 1), y: priceNorm[i] })),
        W, H
    );

    const weightPaths = sorted.map(series => {
        const etf = series[0].etf_code;
        const path = buildPath(
            series.map(p => ({ x: dateIdx[p.date] / (len - 1 || 1), y: normShared(p.weight) })),
            W, H
        );
        const latest = series[series.length - 1]?.weight ?? 0;
        return { etf, path, color: etfColors[etf] ?? '#6366f1', latest };
    });

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-32 overflow-visible">
            <path d={pricePath} fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 2" />
            {weightPaths.map(wp => (
                <path key={wp.etf} d={wp.path} fill="none" stroke={wp.color} strokeWidth="2" strokeLinecap="round" />
            ))}
        </svg>
    );
}

// ── 主元件 ────────────────────────────────────────────────────────────────────

export function HoldingsPriceOverlayChart({ stockCode, etfCodes, etfColors }: Props) {
    const [period, setPeriod] = useState<Period>('60');
    const [weightSeries, setWeightSeries] = useState<WeightPoint[][]>([]);
    const [priceSeries, setPriceSeries] = useState<PricePoint[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!stockCode || !etfCodes.length) return;
        setLoading(true);
        const supabase = createClient();
        const days = Number(period);
        const fromDate = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

        Promise.all([
            supabase
                .from('etf_weight_history')
                .select('etf_code, data_date, weight')
                .eq('stock_code', stockCode)
                .in('etf_code', etfCodes)
                .gte('data_date', fromDate)
                .order('data_date'),
            supabase
                .from('stock_prices_daily')
                .select('date, close')
                .eq('stock_code', stockCode)
                .gte('date', fromDate)
                .order('date'),
        ]).then(([{ data: wRows }, { data: pRows }]) => {
            const grouped = new Map<string, WeightPoint[]>();
            for (const r of wRows ?? []) {
                if (!grouped.has(r.etf_code)) grouped.set(r.etf_code, []);
                grouped.get(r.etf_code)!.push({ date: r.data_date, weight: Number(r.weight), etf_code: r.etf_code });
            }
            setWeightSeries([...grouped.values()]);
            setPriceSeries((pRows ?? []).map(r => ({ date: r.date, close: Number(r.close) })));
            setLoading(false);
        });
    }, [stockCode, etfCodes, period]);

    // 按最新比重排序，決定圖例分組
    const sortedSeries = [...weightSeries]
        .filter(s => s.length > 0)
        .sort((a, b) => (b[b.length - 1]?.weight ?? 0) - (a[a.length - 1]?.weight ?? 0));
    const shown = sortedSeries.slice(0, MAX_ETF_LINES);
    const hidden = sortedSeries.slice(MAX_ETF_LINES);

    return (
        <div className="space-y-2">
            {/* 工具列 */}
            <div className="flex items-center gap-1 flex-wrap">
                {(['30', '60', '90'] as Period[]).map(p => (
                    <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        className={`px-2 py-0.5 text-xs rounded transition-colors ${
                            period === p
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 font-medium'
                                : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        {p}D
                    </button>
                ))}
                <span className="ml-auto text-xs text-slate-400 flex items-center gap-2">
                    <span className="inline-block w-4 border-t-2 border-slate-400 border-dashed" />股價
                    <span className="inline-block w-4 border-t-2 border-indigo-500" />比重
                </span>
            </div>

            {/* 圖表 */}
            {loading ? (
                <div className="h-32 animate-pulse bg-slate-100 dark:bg-slate-800 rounded" />
            ) : (
                <MiniChart weightSeries={weightSeries} priceSeries={priceSeries} etfColors={etfColors} />
            )}

            {/* 圖例：顯示圖上的 ETF + 最新比重 */}
            {!loading && shown.length > 0 && (
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                    {shown.map(s => {
                        const etf = s[0].etf_code;
                        const latest = s[s.length - 1]?.weight ?? 0;
                        const color = etfColors[etf] ?? '#6366f1';
                        return (
                            <span key={etf} className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400">
                                <span className="inline-block w-3 h-0.5 rounded" style={{ backgroundColor: color }} />
                                <span className="font-mono font-bold" style={{ color }}>{etf}</span>
                                <span className="text-slate-400">{latest.toFixed(2)}%</span>
                            </span>
                        );
                    })}
                    {hidden.length > 0 && (
                        <span className="text-[11px] text-slate-400">
                            +{hidden.length} 支未顯示（{hidden.map(s => s[0].etf_code).join('、')}）
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
