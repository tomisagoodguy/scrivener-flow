'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { SectorStock } from '@/app/actions/getSectorStrength';
import { blockColor, textColor, computeTreemap, type TreemapItem } from '@/lib/investment/treemapUtils';
import { fmtPct, fmtAmount } from '@/lib/investment/formatUtils';

type Period = '1d' | '5d' | '20d';

interface StrategyStockItem extends TreemapItem {
    stock: SectorStock;
    category: string;
}

interface TooltipState {
    x: number;
    y: number;
    stock: SectorStock;
}

interface Props {
    stocks: SectorStock[];
    period: Period;
}

export default function StrategyHeatmap({ stocks, period }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });
    const [tooltip, setTooltip] = useState<TooltipState | null>(null);
    const router = useRouter();

    useEffect(() => {
        const obs = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect;
            setSize({ width, height });
        });
        if (containerRef.current) obs.observe(containerRef.current);
        return () => obs.disconnect();
    }, []);

    const retKey = period === '1d' ? 'ret_1d' : period === '5d' ? 'ret_5d' : 'ret_20d';

    const items: StrategyStockItem[] = stocks
        .filter((s) => s.stock_id)
        .map((s) => ({
            id: s.stock_id,
            value: Math.max(s.amount ?? 1e8, 1),
            pct: s[retKey],
            label: s.stock_name ?? s.stock_id,
            stock: s,
            category: s.category ?? '其他',
        }));

    const blocks = computeTreemap(items, size.width, size.height);

    const handleMouseMove = useCallback((e: React.MouseEvent, stock: SectorStock) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, stock });
    }, []);

    const handleMouseLeave = useCallback(() => setTooltip(null), []);

    if (stocks.length === 0) {
        return (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                暫無策略股資料
            </div>
        );
    }

    return (
        <div>
            <div
                ref={containerRef}
                className="relative w-full overflow-hidden rounded-xl"
                style={{ height: 360, minHeight: 240 }}
            >
                {blocks.map((block, idx) => {
                    const pct = block.item.pct;
                    const bg = blockColor(pct);
                    const fg = textColor(pct);
                    const showLabel = block.width > 44 && block.height > 24;
                    const showPct = block.width > 44 && block.height > 48;
                    const showName = block.width > 60 && block.height > 36;

                    return (
                        <div
                            key={`${block.item.id}-${idx}`}
                            onClick={() => router.push(`/investment/stock/${block.item.id}`)}
                            onMouseMove={(e) => handleMouseMove(e, block.item.stock)}
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
                            className="flex flex-col items-center justify-center overflow-hidden select-none transition-opacity hover:opacity-80"
                        >
                            {showLabel && (
                                <span className="text-xs font-bold leading-tight text-center px-0.5 w-full truncate text-center">
                                    {block.item.id}
                                </span>
                            )}
                            {showName && (
                                <span className="text-[10px] leading-tight text-center px-0.5 w-full truncate text-center opacity-80">
                                    {block.item.stock.stock_name ?? ''}
                                </span>
                            )}
                            {showPct && (
                                <span className="text-xs font-bold leading-tight mt-0.5">
                                    {fmtPct(pct)}
                                </span>
                            )}
                        </div>
                    );
                })}

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
                        <div className="font-bold">
                            {tooltip.stock.stock_name ?? tooltip.stock.stock_id}
                            <span className="ml-1.5 text-xs font-normal text-slate-400">{tooltip.stock.stock_id}</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">{tooltip.stock.category ?? '—'}</div>
                        <div
                            className="font-bold mt-1"
                            style={{
                                color: tooltip.stock[retKey] === null ? '#94a3b8'
                                    : (tooltip.stock[retKey] ?? 0) >= 0 ? '#f87171' : '#4ade80',
                            }}
                        >
                            {fmtPct(tooltip.stock[retKey])}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">成交 {fmtAmount(tooltip.stock.amount)}</div>
                    </div>
                )}
            </div>

            <div className="flex items-center justify-end gap-2 mt-2 text-xs text-gray-400">
                <span>跌多</span>
                {['#14532d', '#16a34a', '#4ade80', '#bbf7d0', '#e5e7eb', '#fecaca', '#f87171', '#dc2626', '#991b1b'].map((c) => (
                    <span key={c} className="inline-block w-4 h-3 rounded-sm" style={{ backgroundColor: c }} />
                ))}
                <span>漲多</span>
            </div>
        </div>
    );
}
