'use client';

import type { HeatmapCell, ReturnBin, HeatmapStatMode } from '@/types/revenuelab';
import { valueToColor, textColorClass, formatMonth } from './heatmapUtils';

const STAT_MODE_LABELS: Record<HeatmapStatMode, string> = {
    median: '中位數 YOY',
    mean: '平均值 YOY',
    stdDev: '標準差',
    positiveRate: '正增長比例',
};

interface HeatmapCellContentProps {
    cell: HeatmapCell;
    bin: ReturnBin;
    mode: HeatmapStatMode;
}

export function HeatmapCellContent({ cell, bin, mode }: HeatmapCellContentProps) {
    const value = cell[mode];
    const bg = valueToColor(value, mode);
    const tc = textColorClass(value, mode);
    const modeLabel = STAT_MODE_LABELS[mode] ?? mode;
    const tooltipText = `${bin.label} | ${formatMonth(cell.month)}\n${modeLabel}: ${value.toFixed(1)}%\n中位數: ${cell.median.toFixed(1)}%\n平均值: ${cell.mean.toFixed(1)}%\n樣本數: ${cell.dataPoints} 檔`;

    return (
        <div
            title={tooltipText}
            className={`py-2 text-center text-xs font-mono font-bold cursor-default transition-transform hover:scale-105 hover:z-10 hover:shadow-md rounded-sm ${tc}`}
            style={{ backgroundColor: bg }}
        >
            {value.toFixed(0)}
            {mode === 'positiveRate' ? '%' : ''}
        </div>
    );
}
