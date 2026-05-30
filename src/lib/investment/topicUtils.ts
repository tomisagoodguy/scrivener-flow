import topicMapData from './topicMap.json';
import type { TopicStockReturn } from '@/app/actions/getTopicStockReturns';
import type { Holding } from '@/types/investment';

export interface TopicEntry {
    id: string;
    shortname: string;
    name: string;
    group: string;
    description: string;
    stocks: string[];
    companyCount: number;
}

/** 含當日漲跌統計的題材（供 SectorTopicHeatmap 使用） */
export interface TopicWithStats extends TopicEntry {
    /** 成分股日漲跌中位數（百分比單位，e.g. 1.5 = 1.5%）；無資料時為 null */
    avgRet1d: number | null;
    /** 成分股漲跌資料（change_pct 為小數格式，e.g. 0.015 = 1.5%） */
    stockReturns: Record<string, TopicStockReturn>;
}

/**
 * 建立 stockCode → TopicEntry[] 反查表。
 * 以模組層級常數執行，靜態資料只 iterate 一次。
 */
export function buildStockTopicMap(): Map<string, TopicEntry[]> {
    const map = new Map<string, TopicEntry[]>();
    for (const topic of topicMapData as TopicEntry[]) {
        for (const stock of topic.stocks) {
            if (!map.has(stock)) map.set(stock, []);
            map.get(stock)!.push(topic);
        }
    }
    return map;
}

// Module-level singleton — built once on import
const _stockTopicMap = buildStockTopicMap();

/**
 * 查詢指定股票代碼所屬的題材清單。
 * @returns 題材陣列（照 topicMap.json 順序）；不屬於任何題材時回傳 []
 */
export function getStockTopics(stockCode: string): TopicEntry[] {
    return _stockTopicMap.get(stockCode) ?? [];
}

// ---------------------------------------------------------------------------
// DB-driven topic helpers（與 stock_topics / stock_topic_assignments 資料表對接）
// ---------------------------------------------------------------------------

export interface TopicChip {
    topic_id: string;
    short_name: string;
    color: string;
}

export interface TopicMeta {
    topic_id: string;
    name: string;
    short_name: string;
    color: string;
}

export interface TopicWeightRow extends TopicMeta {
    total_weight: number;
    holding_count: number;
}

type TopicMap = Record<string, TopicChip[]>;

/** 為每個 holding 附加最多 3 個主題標籤（server-side join 後呼叫） */
export function attachTopicsToHoldings(
    holdings: Holding[],
    topicMap: TopicMap,
): Holding[] {
    return holdings.map(h => ({
        ...h,
        topics: (topicMap[h.stock_code] ?? []).slice(0, 3),
    }));
}

/** 依 topic URL param 過濾持股（server-side filter，null 代表不過濾） */
export function filterHoldingsByTopic(
    holdings: Holding[],
    topic: string | null,
    topicMap: TopicMap,
): Holding[] {
    if (!topic) return holdings;
    return holdings.filter(h =>
        (topicMap[h.stock_code] ?? []).some(t => t.topic_id === topic)
    );
}

/**
 * 計算各主題的 ETF 持股加權合計（供熱力圖 Server Action 使用）。
 * 排除 holding_count = 0 的主題。
 */
export function aggregateTopicWeights(
    topics: TopicMeta[],
    assignments: { stock_code: string; topic_id: string }[],
    holdings: { stock_code: string; weight: number }[],
): TopicWeightRow[] {
    const holdingWeightMap = new Map<string, number>(
        holdings.map(h => [h.stock_code, h.weight])
    );

    const byTopic = new Map<string, { total_weight: number; holding_count: number }>();

    for (const a of assignments) {
        const w = holdingWeightMap.get(a.stock_code);
        if (w === undefined) continue;
        const existing = byTopic.get(a.topic_id) ?? { total_weight: 0, holding_count: 0 };
        byTopic.set(a.topic_id, {
            total_weight: existing.total_weight + w,
            holding_count: existing.holding_count + 1,
        });
    }

    return topics
        .filter(t => (byTopic.get(t.topic_id)?.holding_count ?? 0) > 0)
        .map(t => ({
            ...t,
            total_weight: byTopic.get(t.topic_id)!.total_weight,
            holding_count: byTopic.get(t.topic_id)!.holding_count,
        }))
        .sort((a, b) => b.total_weight - a.total_weight);
}
