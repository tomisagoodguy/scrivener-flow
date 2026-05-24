'use client';

import { useMemo, useState } from 'react';
import { Treemap, ResponsiveContainer } from 'recharts';
import type { TreemapDataType } from 'recharts/types/chart/Treemap';
import type { TreemapStock } from '@/app/actions/getTreemapData';

interface Props {
    stocks: TreemapStock[];
    date: string;
}

function getColor(changePct: number | null): string {
    const v = changePct ?? 0;
    if (v >= 0.06)  return '#7f1d1d';
    if (v >= 0.035) return '#991b1b';
    if (v >= 0.015) return '#dc2626';
    if (v >= 0.003) return '#fca5a5';
    if (v > -0.003) return '#94a3b8';
    if (v > -0.015) return '#6ee7b7';
    if (v > -0.035) return '#10b981';
    if (v > -0.06)  return '#059669';
    return '#065f46';
}

function getSectorStroke(avg: number): string {
    if (avg >= 0.02)  return 'rgba(252,100,100,0.6)';
    if (avg >= 0)     return 'rgba(252,165,165,0.4)';
    if (avg >= -0.02) return 'rgba(110,231,183,0.4)';
    return 'rgba(52,211,153,0.6)';
}

function getSectorFill(avg: number): string {
    if (avg >= 0.02)  return 'rgba(127,29,29,0.18)';
    if (avg >= 0)     return 'rgba(220,38,38,0.08)';
    if (avg >= -0.02) return 'rgba(16,185,129,0.08)';
    return 'rgba(6,95,70,0.18)';
}

interface StockEntry {
    name: string;
    size: number;
    stock: TreemapStock;
}

interface SectorGroup {
    name: string;
    avgChangePct: number;
    children: StockEntry[];
}

function buildTreemapData(stocks: TreemapStock[]): SectorGroup[] {
    const groups = new Map<string, TreemapStock[]>();

    for (const s of stocks) {
        if ((s.close ?? 0) <= 0) continue;
        const industry = s.industry ?? '其他';
        if (!groups.has(industry)) groups.set(industry, []);
        groups.get(industry)!.push(s);
    }

    return Array.from(groups.entries())
        .map(([name, groupStocks]) => {
            const totalCap = groupStocks.reduce((sum, s) => sum + (s.market_cap ?? 1), 0);
            const avgChangePct =
                groupStocks.reduce((sum, s) => sum + (s.change_pct ?? 0) * (s.market_cap ?? 1), 0) /
                (totalCap || 1);

            return {
                name,
                avgChangePct,
                children: groupStocks
                    .sort((a, b) => (b.market_cap ?? 0) - (a.market_cap ?? 0))
                    .map((s) => ({
                        name: s.stock_name ?? s.stock_code,
                        size: s.market_cap ?? 1,
                        stock: s,
                    })),
            };
        })
        .sort(
            (a, b) =>
                b.children.reduce((s, c) => s + c.size, 0) -
                a.children.reduce((s, c) => s + c.size, 0),
        );
}

interface CellProps {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    depth?: number;
    name?: string;
    stock?: TreemapStock;
    avgChangePct?: number;
    onSectorClick?: (name: string) => void;
}

function CustomCell({ x = 0, y = 0, width = 0, height = 0, depth, name, stock, avgChangePct, onSectorClick }: CellProps) {
    if (width < 2 || height < 2) return null;

    if (depth === 1) {
        const avg = avgChangePct ?? 0;
        const showName = width > 70 && height > 26;
        const avgStr = `${avg >= 0 ? '+' : ''}${(avg * 100).toFixed(1)}%`;

        return (
            <g
                onClick={() => onSectorClick?.(name ?? '')}
                style={{ cursor: 'pointer' }}
            >
                <rect
                    x={x + 1} y={y + 1}
                    width={width - 2} height={height - 2}
                    fill={getSectorFill(avg)}
                    stroke={getSectorStroke(avg)}
                    strokeWidth={1.5}
                    rx={6}
                />
                {showName && (
                    <text
                        x={x + 8} y={y + 15}
                        fill="rgba(255,255,255,0.9)"
                        fontSize={Math.min(11, width / 9)}
                        fontWeight="700"
                        fontFamily="system-ui, sans-serif"
                        style={{ pointerEvents: 'none' }}
                    >
                        {name}
                    </text>
                )}
                {showName && width > 140 && (
                    <text
                        x={x + width - 8} y={y + 15}
                        textAnchor="end"
                        fill={avg >= 0 ? 'rgba(252,165,165,0.9)' : 'rgba(110,231,183,0.9)'}
                        fontSize={Math.min(10, width / 12)}
                        fontWeight="600"
                        fontFamily="system-ui, sans-serif"
                        style={{ pointerEvents: 'none' }}
                    >
                        {avgStr}
                    </text>
                )}
                <title>{`${name}\n族群平均 ${avgStr}`}</title>
            </g>
        );
    }

    if (depth === 2) {
        const bg = getColor(stock?.change_pct ?? null);
        const pct = stock?.change_pct ?? 0;
        const pctStr = `${pct >= 0 ? '+' : ''}${(pct * 100).toFixed(2)}%`;
        const showLabel = width > 32 && height > 22;
        const showPct = width > 48 && height > 40;
        const isNeutral = Math.abs(pct) < 0.003;
        const textFill = isNeutral ? '#1e293b' : '#ffffff';
        const fontSize = Math.min(11, width / 5.5, height / 3);
        const pctSize = Math.min(9, width / 7, height / 4.5);
        const code = stock?.stock_code ?? '';
        const sname = stock?.stock_name ?? code;

        return (
            <g>
                <title>{`${code} ${sname}\n${pctStr}`}</title>
                <rect
                    x={x + 1} y={y + 1}
                    width={Math.max(width - 2, 1)}
                    height={Math.max(height - 2, 1)}
                    fill={bg}
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth={0.5}
                    rx={3}
                />
                {showLabel && (
                    <text
                        x={x + width / 2}
                        y={y + height / 2 - (showPct ? 7 : 0)}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={textFill}
                        fontSize={fontSize}
                        fontWeight="600"
                        fontFamily="system-ui, sans-serif"
                        style={{ pointerEvents: 'none' }}
                    >
                        {sname}
                    </text>
                )}
                {showPct && (
                    <text
                        x={x + width / 2}
                        y={y + height / 2 + 9}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={textFill}
                        fontSize={pctSize}
                        fontFamily="system-ui, sans-serif"
                        style={{ pointerEvents: 'none' }}
                    >
                        {pctStr}
                    </text>
                )}
            </g>
        );
    }

    return null;
}

const LEGEND_STOPS = [
    { color: '#065f46', label: '大跌' },
    { color: '#059669', label: '' },
    { color: '#10b981', label: '' },
    { color: '#6ee7b7', label: '' },
    { color: '#94a3b8', label: '平' },
    { color: '#fca5a5', label: '' },
    { color: '#dc2626', label: '' },
    { color: '#991b1b', label: '' },
    { color: '#7f1d1d', label: '大漲' },
];

const TOP_N_OPTIONS: { label: string; value: number | null }[] = [
    { label: '前 200', value: 200 },
    { label: '前 500', value: 500 },
    { label: '全部', value: null },
];

export default function SectorTreemap({ stocks, date }: Props) {
    const [topN, setTopN] = useState<number | null>(200);
    const [selectedSector, setSelectedSector] = useState<string | null>(null);

    const filteredStocks = useMemo(() => {
        if (selectedSector) {
            return stocks.filter((s) => (s.industry ?? '其他') === selectedSector);
        }
        if (topN !== null) {
            return [...stocks]
                .sort((a, b) => (b.market_cap ?? 0) - (a.market_cap ?? 0))
                .slice(0, topN);
        }
        return stocks;
    }, [stocks, topN, selectedSector]);

    const data = useMemo(() => buildTreemapData(filteredStocks), [filteredStocks]);

    const stats = useMemo(() => {
        const valid = filteredStocks.filter((s) => s.change_pct !== null);
        const rising = valid.filter((s) => (s.change_pct ?? 0) > 0).length;
        const falling = valid.filter((s) => (s.change_pct ?? 0) < 0).length;
        return { rising, falling, total: valid.length };
    }, [filteredStocks]);

    const handleSectorClick = (name: string) => {
        setSelectedSector((prev) => (prev === name ? null : name));
    };

    if (data.length === 0) {
        return (
            <div className="glass-card flex items-center justify-center h-64 text-gray-400">
                資料尚未更新{date ? `（最近日期：${date}）` : ''}
            </div>
        );
    }

    return (
        <div className="glass-card overflow-hidden">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 pb-3 border-b border-white/20">
                <div className="flex items-center gap-3 flex-wrap">
                    {selectedSector ? (
                        <>
                            <button
                                onClick={() => setSelectedSector(null)}
                                className="text-xs text-blue-500 hover:text-blue-400 hover:underline transition-colors"
                            >
                                ← 全市場
                            </button>
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                {selectedSector}
                            </span>
                        </>
                    ) : (
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                            全市場個股熱力圖
                        </span>
                    )}
                    <span className="text-xs text-gray-400">{date}</span>
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-rose-500 font-medium">▲ {stats.rising}</span>
                        <span className="text-gray-400">/</span>
                        <span className="text-emerald-500 font-medium">▼ {stats.falling}</span>
                        <span className="text-gray-400">共 {stats.total} 支</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Top-N filter（放大族群時隱藏） */}
                    {!selectedSector && (
                        <div className="flex rounded-lg overflow-hidden border border-gray-200/50 dark:border-white/10">
                            {TOP_N_OPTIONS.map((opt) => (
                                <button
                                    key={opt.label}
                                    onClick={() => setTopN(opt.value)}
                                    className={`px-3 py-1 text-xs font-medium transition-colors ${
                                        topN === opt.value
                                            ? 'bg-blue-600 text-white'
                                            : 'text-gray-500 hover:bg-gray-100/50 dark:hover:bg-white/10'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Legend */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">跌</span>
                        <div className="flex rounded overflow-hidden" style={{ gap: 1 }}>
                            {LEGEND_STOPS.map((s) => (
                                <div
                                    key={s.color}
                                    title={s.label || undefined}
                                    style={{ backgroundColor: s.color, width: 16, height: 14 }}
                                />
                            ))}
                        </div>
                        <span className="text-xs text-gray-400">漲</span>
                    </div>
                </div>
            </div>

            {/* Hint */}
            <div className="px-4 py-1.5 text-xs text-gray-400 bg-white/10">
                {selectedSector
                    ? '點族群邊框切換族群 · 點「← 全市場」返回 · 滑鼠停留顯示股票詳情'
                    : '方塊大小 = 市值 · 顏色 = 漲跌幅 · 點族群邊框放大該族群 · 滑鼠停留顯示詳情'}
            </div>

            {/* Treemap */}
            <ResponsiveContainer width="100%" height={580}>
                <Treemap
                    data={data as unknown as TreemapDataType[]}
                    dataKey="size"
                    content={(props: CellProps) => (
                        <CustomCell {...props} onSectorClick={handleSectorClick} />
                    )}
                    isAnimationActive={false}
                />
            </ResponsiveContainer>
        </div>
    );
}
