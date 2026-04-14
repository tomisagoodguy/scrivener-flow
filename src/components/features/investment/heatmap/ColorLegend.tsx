'use client';

import type { HeatmapStatMode } from '@/types/revenuelab';
import { valueToColor } from './heatmapUtils';

interface ColorLegendProps {
    mode: HeatmapStatMode;
}

export function ColorLegend({ mode }: ColorLegendProps) {
    const steps =
        mode === 'positiveRate'
            ? [0, 25, 50, 75, 100]
            : mode === 'stdDev'
              ? [0, 50, 100, 150]
              : [-100, -50, 0, 50, 100, 200];

    return (
        <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>低</span>
            <div className="flex h-3 rounded overflow-hidden" style={{ width: 120 }}>
                {steps.map((v, i) => (
                    <div key={i} className="flex-1" style={{ backgroundColor: valueToColor(v, mode) }} />
                ))}
            </div>
            <span>高</span>
        </div>
    );
}
