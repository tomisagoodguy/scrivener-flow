import { forceSimulation, forceCenter, forceCollide, forceManyBody, type SimulationNodeDatum } from 'd3-force';
import type { SectorResonanceHeat } from '@/lib/investment/sectorResonanceUtils';

export interface ResonanceBubbleNode extends SectorResonanceHeat, SimulationNodeDatum {
    r: number;
}

const MIN_RADIUS = 20;
const MAX_RADIUS = 70;
const COLLISION_PADDING = 4;
const SIMULATION_TICKS = 300;

export function layoutResonanceBubbles(
    heatData: SectorResonanceHeat[],
    width = 600,
    height = 400,
): ResonanceBubbleNode[] {
    if (heatData.length === 0) return [];

    const heatScores = heatData.map(d => d.heatScore);
    const minHeat = Math.min(...heatScores);
    const maxHeat = Math.max(...heatScores);
    const heatRange = maxHeat - minHeat;

    const nodes: ResonanceBubbleNode[] = heatData.map((d, i) => {
        const angle = (i / heatData.length) * 2 * Math.PI;
        return {
            ...d,
            r: heatRange === 0
                ? (MIN_RADIUS + MAX_RADIUS) / 2
                : MIN_RADIUS + ((d.heatScore - minHeat) / heatRange) * (MAX_RADIUS - MIN_RADIUS),
            // seed positions on a small circle so the simulation has distinct
            // starting points to push apart, rather than all stacking at the center
            x: width / 2 + Math.cos(angle) * 10,
            y: height / 2 + Math.sin(angle) * 10,
        };
    });

    const simulation = forceSimulation(nodes)
        .force('center', forceCenter(width / 2, height / 2))
        .force('charge', forceManyBody().strength(5))
        .force('collide', forceCollide<ResonanceBubbleNode>(d => d.r + COLLISION_PADDING))
        .stop();

    for (let i = 0; i < SIMULATION_TICKS; i++) {
        simulation.tick();
    }

    return nodes;
}

// Warm-neutral (amber) scale, low -> high heat. Deliberately excludes the
// rose/emerald pair reserved for TW price gain/loss elsewhere in the module.
const HEAT_COLOR_SCALE = ['#fef3c7', '#fcd34d', '#f59e0b', '#b45309'] as const;

export function getHeatQuartileColor(heatScore: number, allScores: number[]): string {
    if (allScores.length === 0) return HEAT_COLOR_SCALE[0];

    const sorted = [...allScores].sort((a, b) => a - b);
    const rank = sorted.filter(s => s <= heatScore).length;
    const percentile = rank / sorted.length;
    const quartileIndex = Math.min(HEAT_COLOR_SCALE.length - 1, Math.floor(percentile * HEAT_COLOR_SCALE.length));

    return HEAT_COLOR_SCALE[quartileIndex];
}
getHeatQuartileColor.SCALE = HEAT_COLOR_SCALE;
