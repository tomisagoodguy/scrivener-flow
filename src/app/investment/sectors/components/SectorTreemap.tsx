'use client';

import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import type { TreemapDataType } from 'recharts/types/chart/Treemap';
import type { TreemapStock } from '@/app/actions/getTreemapData';

interface Props {
    stocks: TreemapStock[];
    date: string;
}

// 6-tier color encoding per spec (台股色彩慣例：紅漲綠跌)
function getColor(changePct: number | null): string {
    const v = changePct ?? 0;
    if (v >= 0.035) return '#be123c';   // rose-700 (deep red)
    if (v >= 0.015) return '#e11d48';   // rose-600
    if (v >= 0.003) return '#fda4af';   // rose-300
    if (v > -0.003) return '#d1d5db';   // gray-300 (neutral)
    if (v > -0.015) return '#6ee7b7';   // emerald-300
    if (v > -0.035) return '#059669';   // emerald-600
    return '#065f46';                   // emerald-800 (deep green)
}

interface TreemapEntry {
    name: string;
    size: number;
    stock: TreemapStock;
}

// recharts Treemap expects { name, children } or flat { name, size } data
function buildTreemapData(stocks: TreemapStock[]): TreemapEntry[] {
    return stocks
        .filter((s) => (s.market_cap ?? 0) > 0)
        .map((s) => ({
            name: s.stock_name ?? s.stock_code,
            size: s.market_cap!,
            stock: s,
        }));
}

interface CellProps {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    root?: unknown;
    depth?: number;
    value?: number;
    name?: string;
    index?: number;
    stock?: TreemapStock;
}

function CustomCell(props: CellProps) {
    const { x = 0, y = 0, width = 0, height = 0, depth, stock } = props;
    if (depth !== 1 || width < 1 || height < 1) return null;

    const bg = getColor(stock?.change_pct ?? null);
    const pct = stock?.change_pct ?? 0;
    const pctStr = pct >= 0 ? `+${(pct * 100).toFixed(2)}%` : `${(pct * 100).toFixed(2)}%`;
    const showLabel = width > 40 && height > 30;
    const showPct = width > 50 && height > 45;

    return (
        <g>
            <rect x={x} y={y} width={width} height={height} fill={bg} stroke="#fff" strokeWidth={1} rx={2} />
            {showLabel && (
                <text
                    x={x + width / 2}
                    y={y + height / 2 - (showPct ? 8 : 0)}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#fff"
                    fontSize={Math.min(12, width / 6, height / 3)}
                    fontWeight="600"
                >
                    {stock?.stock_name ?? stock?.stock_code ?? ''}
                </text>
            )}
            {showPct && (
                <text
                    x={x + width / 2}
                    y={y + height / 2 + 10}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#fff"
                    fontSize={Math.min(10, width / 7, height / 4)}
                >
                    {pctStr}
                </text>
            )}
        </g>
    );
}

interface TooltipEntry {
    payload?: { stock?: TreemapStock }[];
}

function CustomTooltip({ payload }: TooltipEntry) {
    const stock = payload?.[0]?.stock;
    if (!stock) return null;
    const pct = stock.change_pct ?? 0;
    const pctStr = pct >= 0 ? `+${(pct * 100).toFixed(2)}%` : `${(pct * 100).toFixed(2)}%`;

    return (
        <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-2 shadow-lg text-sm">
            <p className="font-semibold text-gray-800">{stock.stock_name} <span className="text-gray-400 font-normal">{stock.stock_code}</span></p>
            {stock.industry && <p className="text-gray-500">{stock.industry}</p>}
            <p className="text-gray-700">收盤：{stock.close?.toFixed(2) ?? '—'}</p>
            <p className={pct >= 0 ? 'text-rose-600 font-medium' : 'text-emerald-600 font-medium'}>漲跌：{pctStr}</p>
        </div>
    );
}

export default function SectorTreemap({ stocks, date }: Props) {
    const data = buildTreemapData(stocks);

    if (data.length === 0) {
        return (
            <div className="glass-card flex items-center justify-center h-64 text-gray-400">
                資料尚未更新{date ? `（最近日期：${date}）` : ''}
            </div>
        );
    }

    return (
        <div className="glass-card p-4">
            <div className="flex items-center gap-3 mb-3">
                <p className="text-sm text-gray-500">資料日期：{date}</p>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                    <span className="inline-block w-3 h-3 rounded-sm bg-rose-600" />漲
                    <span className="inline-block w-3 h-3 rounded-sm bg-gray-300 ml-1" />平
                    <span className="inline-block w-3 h-3 rounded-sm bg-emerald-600 ml-1" />跌
                </div>
            </div>
            <ResponsiveContainer width="100%" height={560}>
                <Treemap
                    data={data as unknown as TreemapDataType[]}
                    dataKey="size"
                    content={<CustomCell />}
                >
                    <Tooltip content={<CustomTooltip />} />
                </Treemap>
            </ResponsiveContainer>
        </div>
    );
}
