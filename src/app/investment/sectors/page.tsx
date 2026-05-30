export const revalidate = 3600;

import { getSectorStrength } from '@/app/actions/getSectorStrength';
import { getFactorIC } from '@/app/actions/getFactorIC';
import { getEtfSectorActivity, type EtfSectorActivityMap } from '@/app/actions/getEtfSectorActivity';
import { getTreemapData } from '@/app/actions/getTreemapData';
import { getAdlData } from '@/app/actions/getAdlData';
import { getConsensusSignals } from '@/app/actions/getConsensusSignals';
import { getTopicStockReturns } from '@/app/actions/getTopicStockReturns';
import { getTopicHeatmapData } from '@/app/actions/getTopicHeatmapData';
import type { TopicWeightRow } from '@/lib/investment/topicUtils';
import type { ConsensusSignal } from '@/types';
import topicMapRaw from '@/lib/investment/topicMap.json';
import type { TopicEntry, TopicWithStats } from '@/lib/investment/topicUtils';
import SectorDashboard from './SectorDashboard';
import { getPublicClient } from '@/lib/supabase/service';

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

    const [sectorData, icData, treemapData, adlData, rawConsensus, stockReturns, etfTopics] = await Promise.all([
        getSectorStrength(),
        getFactorIC(SECTOR_PROXY_FACTORS, 12),
        getTreemapData(),
        getAdlData(),
        getConsensusSignals().catch(() => ({ signals: [], date: null })),
        getTopicStockReturns(allStockCodes),
        getTopicHeatmapData().catch(() => []),
    ]);
    const etfActivity = await getEtfSectorActivity(sectorData.date);

    // Build holdingsByTopic for EtfTopicHeatmap panel
    let etfTopicHoldings: Record<string, { stock_code: string; stock_name: string; weight: number }[]> = {};
    if (etfTopics.length > 0) {
        const allTopicCodes = etfTopics.flatMap(t => []);
        const publicClient = getPublicClient();
        const { data: latestRow } = await publicClient
            .from('etf_holdings_snapshot')
            .select('data_date')
            .order('data_date', { ascending: false })
            .limit(1)
            .single();
        const canonicalDate = (latestRow as { data_date: string } | null)?.data_date;
        if (canonicalDate) {
            const [{ data: assignments }, { data: snapshots }] = await Promise.all([
                publicClient.from('stock_topic_assignments').select('stock_code, topic_id'),
                publicClient
                    .from('etf_holdings_snapshot')
                    .select('stock_code, stock_name, weight')
                    .eq('data_date', canonicalDate),
            ]);
            const holdingMap = new Map<string, { stock_name: string; weight: number }>(
                ((snapshots as { stock_code: string; stock_name: string | null; weight: number | null }[]) ?? []).map(h => [
                    h.stock_code,
                    { stock_name: h.stock_name ?? '', weight: Number(h.weight ?? 0) },
                ])
            );
            for (const a of (assignments as { stock_code: string; topic_id: string }[]) ?? []) {
                const h = holdingMap.get(a.stock_code);
                if (!h) continue;
                if (!etfTopicHoldings[a.topic_id]) etfTopicHoldings[a.topic_id] = [];
                etfTopicHoldings[a.topic_id].push({ stock_code: a.stock_code, ...h });
            }
        }
    }

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
            <SectorDashboard data={sectorData} icData={icData} etfActivity={etfActivity} treemapData={treemapData} adlData={adlData} consensusMap={consensusMap} topics={topics} etfTopics={etfTopics} etfTopicHoldings={etfTopicHoldings} />
        </div>
    );
}

export type { EtfSectorActivityMap };
