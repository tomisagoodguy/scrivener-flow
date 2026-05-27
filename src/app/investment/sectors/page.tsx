export const revalidate = 3600;

import { getSectorStrength } from '@/app/actions/getSectorStrength';
import { getFactorIC } from '@/app/actions/getFactorIC';
import { getEtfSectorActivity, type EtfSectorActivityMap } from '@/app/actions/getEtfSectorActivity';
import { getTreemapData } from '@/app/actions/getTreemapData';
import { getAdlData } from '@/app/actions/getAdlData';
import { getConsensusSignals } from '@/app/actions/getConsensusSignals';
import { getTopicStockReturns } from '@/app/actions/getTopicStockReturns';
import type { ConsensusSignal } from '@/types';
import topicMapRaw from '@/lib/investment/topicMap.json';
import type { TopicEntry, TopicWithStats } from '@/lib/investment/topicUtils';
import SectorDashboard from './SectorDashboard';

export const metadata = { title: '族群強弱 | 投資監控' };

const SECTOR_PROXY_FACTORS = ['sector_ret_1d', 'sector_ret_5d', 'vol_ratio_20d', 'above_ma20_pct'];

function median(values: number[]): number | null {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
}

export default async function SectorsPage() {
    const topicMap = topicMapRaw as TopicEntry[];
    const allStockCodes = Array.from(new Set(topicMap.flatMap((t) => t.stocks)));

    const [sectorData, icData, treemapData, adlData, rawConsensus, stockReturns] = await Promise.all([
        getSectorStrength(),
        getFactorIC(SECTOR_PROXY_FACTORS, 12),
        getTreemapData(),
        getAdlData(),
        getConsensusSignals().catch(() => ({ signals: [], date: null })),
        getTopicStockReturns(allStockCodes),
    ]);
    const etfActivity = await getEtfSectorActivity(sectorData.date);

    const consensusMap: Record<string, ConsensusSignal> = {};
    for (const s of rawConsensus.signals) consensusMap[s.stock_id] = s;

    // 為每個題材計算 avgRet1d（百分比單位），並縮小 stockReturns 至各題材成分股
    const topics: TopicWithStats[] = topicMap.map((topic) => {
        const topicStockReturns = Object.fromEntries(
            topic.stocks.flatMap((code) => {
                const r = stockReturns[code];
                return r !== undefined ? [[code, r]] : [];
            }),
        );
        const changePcts = Object.values(topicStockReturns)
            .map((r) => r.change_pct)
            .filter((v): v is number => v !== null && v !== undefined);
        const avgRet1d = changePcts.length > 0
            ? median(changePcts.map((v) => v * 100))
            : null;
        return {
            ...topic,
            avgRet1d,
            stockReturns: topicStockReturns,
        };
    });

    return (
        <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">族群強弱</h1>
            <p className="text-sm text-gray-400 mb-4">全市場資金流向，點擊族群展開成分股</p>
            <SectorDashboard data={sectorData} icData={icData} etfActivity={etfActivity} treemapData={treemapData} adlData={adlData} consensusMap={consensusMap} topics={topics} />
        </div>
    );
}

export type { EtfSectorActivityMap };
