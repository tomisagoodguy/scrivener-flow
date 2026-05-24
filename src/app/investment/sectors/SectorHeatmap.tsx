'use client';

import { useState, useEffect, useRef, useTransition, useCallback } from 'react';
import Link from 'next/link';
import type { SectorRow, SectorStock } from '@/app/actions/getSectorStrength';
import { getSectorStocks } from '@/app/actions/getSectorStrength';
import { fmtPct, pctClass, fmtAmount } from '@/lib/investment/formatUtils';
import { blockColor, textColor, computeTreemap, type TreemapItem } from '@/lib/investment/treemapUtils';

export type HeatmapPeriod = '1d' | '5d' | '20d';

const PERIOD_KEY: Record<HeatmapPeriod, keyof SectorRow> = {
    '1d': 'ret_1d',
    '5d': 'ret_5d',
    '20d': 'ret_20d',
};

interface SectorTreemapItem extends TreemapItem {
    sector: SectorRow;
}

interface TooltipState {
    x: number;
    y: number;
    label: string;
    pct: number | null;
}

interface Props {
    sectors: SectorRow[];
    date: string;
    period: HeatmapPeriod;
}

export default function SectorHeatmap({ sectors, date, period }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });
    const [selected, setSelected] = useState<string | null>(null);
    const [stocks, setStocks] = useState<SectorStock[]>([]);
    const [isPending, startTransition] = useTransition();
    const [tooltip, setTooltip] = useState<TooltipState | null>(null);

    useEffect(() => {
        const obs = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect;
            setSize({ width, height });
        });
        if (containerRef.current) obs.observe(containerRef.current);
        return () => obs.disconnect();
    }, []);

    const treemapItems: SectorTreemapItem[] = sectors.map((s) => ({
        id: s.category,
        value: Math.max(s.total_amount ?? s.stock_count * 1e9, 1),
        pct: s[PERIOD_KEY[period]] as number | null,
        label: s.category.split(':').pop() ?? s.category,
        sector: s,
    }));
    const blocks = computeTreemap(treemapItems, size.width, size.height);
    const retKey = PERIOD_KEY[period];

    const handleClick = (category: string) => {
        if (selected === category) { setSelected(null); setStocks([]); return; }
        setSelected(category);
        setStocks([]);
        startTransition(async () => {
            const result = await getSectorStocks(category, date);
            setStocks(result);
        });
    };

    const handleMouseMove = useCallback((e: React.MouseEvent, label: string, pct: number | null) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        setTooltip({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            label,
            pct,
        });
    }, []);

    const handleMouseLeave = useCallback(() => {
        setTooltip(null);
    }, []);

    return (
        <div>
            <div
                ref={containerRef}
                className="relative w-full overflow-hidden rounded-xl"
                style={{ height: '78vh', minHeight: 520 }}
            >
                {blocks.map((block) => {
                    const pct = block.item.sector[retKey] as number | null;
                    const bg = blockColor(pct);
                    const fg = textColor(pct);
                    const label = block.item.label;
                    const showLabel = block.width > 48 && block.height > 26;
                    const showPct = block.width > 48 && block.height > 52;

                    return (
                        <div
                            key={block.item.id}
                            onClick={() => handleClick(block.item.sector.category)}
                            onMouseMove={(e) => handleMouseMove(e, label, pct)}
                            onMouseLeave={handleMouseLeave}
                            style={{
                                position: 'absolute',
                                left: block.x + 1,
                                top: block.y + 1,
                                width: Math.max(block.width - 2, 0),
                                height: Math.max(block.height - 2, 0),
                                backgroundColor: bg,
                                color: fg,
                                borderRadius: 4,
                                cursor: 'pointer',
                            }}
                            className={`flex flex-col items-center justify-center overflow-hidden select-none transition-opacity hover:opacity-80 ${
                                selected === block.item.sector.category ? 'ring-2 ring-white/80' : ''
                            }`}
                        >
                            {showLabel && (
                                <span className="text-xs font-medium leading-tight text-center px-1 w-full truncate text-center">
                                    {label}
                                </span>
                            )}
                            {showPct && (
                                <span className="text-sm font-bold leading-tight mt-0.5">
                                    {fmtPct(pct)}
                                </span>
                            )}
                        </div>
                    );
                })}

                {/* Hover tooltip */}
                {tooltip && (
                    <div
                        className="pointer-events-none absolute z-20 rounded-lg px-3 py-2 text-sm shadow-lg"
                        style={{
                            left: tooltip.x + 12,
                            top: tooltip.y - 8,
                            transform: tooltip.x > size.width * 0.7 ? 'translateX(-110%)' : undefined,
                            backgroundColor: 'rgba(15,23,42,0.92)',
                            backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            color: '#f1f5f9',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        <div className="font-medium">{tooltip.label}</div>
                        <div
                            className="font-bold mt-0.5"
                            style={{
                                color: tooltip.pct === null ? '#94a3b8'
                                    : tooltip.pct >= 0 ? '#f87171' : '#4ade80',
                            }}
                        >
                            {fmtPct(tooltip.pct)}
                        </div>
                    </div>
                )}
            </div>

            {/* Color legend */}
            <div className="flex items-center justify-end gap-2 mt-2 text-xs text-gray-400">
                <span>跌多</span>
                {['#14532d', '#16a34a', '#4ade80', '#bbf7d0', '#e5e7eb', '#fecaca', '#f87171', '#dc2626', '#991b1b'].map((c) => (
                    <span key={c} className="inline-block w-4 h-3 rounded-sm" style={{ backgroundColor: c }} />
                ))}
                <span>漲多</span>
            </div>

            {/* Selected sector stocks */}
            {selected && (
                <div className="glass-card mt-4 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-800 dark:text-gray-100">{selected}</h3>
                        <button
                            onClick={() => { setSelected(null); setStocks([]); }}
                            className="text-gray-400 hover:text-gray-600 text-sm px-2"
                        >
                            ✕
                        </button>
                    </div>
                    {isPending && <p className="text-gray-400 text-sm py-4 text-center">載入中…</p>}
                    {!isPending && stocks.length === 0 && <p className="text-gray-400 text-sm py-4 text-center">無資料</p>}
                    {!isPending && stocks.length > 0 && (() => {
                        const sectorList = stocks.map((s) => s.stock_id).join(',');
                        const sectorFrom = encodeURIComponent(selected ?? '');
                        const sectorListEnc = encodeURIComponent(sectorList);
                        return (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-gray-400 text-xs border-b border-white/20">
                                    <th className="text-left py-1">股票</th>
                                    <th className="text-right py-1 hidden sm:table-cell">成交金額</th>
                                    <th className="text-right py-1">日漲幅</th>
                                    <th className="text-right py-1 hidden sm:table-cell">週漲幅</th>
                                    <th className="text-right py-1 hidden sm:table-cell">月漲幅</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stocks.map((s, idx) => (
                                    <tr key={s.stock_id} className="border-b border-white/10 last:border-0">
                                        <td className="py-1.5 font-medium">
                                            <Link
                                                href={`/investment/stock/${s.stock_id}?from=${sectorFrom}&rank=${idx + 1}&list=${sectorListEnc}`}
                                                className="hover:text-blue-600 transition-colors"
                                            >
                                                {s.stock_name ?? s.stock_id}
                                                <span className="text-gray-400 ml-1 text-xs">{s.stock_id}</span>
                                            </Link>
                                            {s.is_strategy_hit && (
                                                <span className="ml-1.5 text-yellow-400 text-xs" title="策略命中">⚡</span>
                                            )}
                                        </td>
                                        <td className="text-right py-1.5 hidden sm:table-cell text-gray-500 text-xs">{fmtAmount(s.amount)}</td>
                                        <td className={`text-right py-1.5 ${pctClass(s.ret_1d)}`}>{fmtPct(s.ret_1d)}</td>
                                        <td className={`text-right py-1.5 hidden sm:table-cell ${pctClass(s.ret_5d)}`}>{fmtPct(s.ret_5d)}</td>
                                        <td className={`text-right py-1.5 hidden sm:table-cell ${pctClass(s.ret_20d)}`}>{fmtPct(s.ret_20d)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        );
                    })()}
                </div>
            )}
        </div>
    );
}
