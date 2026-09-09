'use client';

import { useMemo, useState } from 'react';
import type { EtfSectorActivityMap } from '@/lib/investment/etfSectorActivityUtils';
import { buildSectorResonanceHeat } from '@/lib/investment/sectorResonanceUtils';
import { layoutResonanceBubbles, getHeatQuartileColor } from '@/lib/investment/sectorResonanceLayout';

const CHART_WIDTH = 720;
const CHART_HEIGHT = 440;

interface Props {
    etfActivity: EtfSectorActivityMap;
}

export function SectorResonanceBubbleChart({ etfActivity }: Props) {
    const [selected, setSelected] = useState<string | null>(null);

    const heatData = useMemo(() => buildSectorResonanceHeat(etfActivity), [etfActivity]);
    const nodes = useMemo(
        () => layoutResonanceBubbles(heatData, CHART_WIDTH, CHART_HEIGHT),
        [heatData],
    );
    const allScores = useMemo(() => heatData.map(d => d.heatScore), [heatData]);

    const selectedNode = nodes.find(n => n.category === selected) ?? null;
    const selectedDetail = selected ? etfActivity[selected] : undefined;

    if (nodes.length === 0) {
        return (
            <div className="glass-card flex items-center justify-center h-64 text-gray-400">
                尚無族群資金活動資料
            </div>
        );
    }

    return (
        <div className="glass-card p-4">
            <svg
                viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                className="w-full h-auto"
                role="img"
                aria-label="族群資金共振氣泡圖"
            >
                {nodes.map(node => (
                    <g
                        key={node.category}
                        data-testid={`resonance-bubble-${node.category}`}
                        onClick={() => setSelected(node.category)}
                        className="cursor-pointer"
                    >
                        <circle
                            cx={node.x}
                            cy={node.y}
                            r={node.r}
                            fill={getHeatQuartileColor(node.heatScore, allScores)}
                            stroke={selected === node.category ? '#78350f' : 'rgba(255,255,255,0.6)'}
                            strokeWidth={selected === node.category ? 2 : 1}
                        />
                        <text
                            x={node.x}
                            y={node.y}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="text-[10px] fill-gray-800 select-none pointer-events-none"
                        >
                            {node.category}
                        </text>
                    </g>
                ))}
            </svg>

            {selectedNode && selectedDetail && (
                <div className="mt-3 border-t border-white/30 pt-3 text-sm">
                    <p className="font-medium text-gray-800 dark:text-gray-100 mb-1">
                        {selectedNode.category}（熱度 {selectedNode.heatScore}）
                    </p>
                    <p className="text-gray-500 dark:text-gray-400">
                        ETF：{selectedDetail.etf_codes.join('、')}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400">
                        個股：{selectedDetail.stock_codes.join('、')}
                    </p>
                </div>
            )}
        </div>
    );
}
