import topicMapData from './topicMap.json';
import type { TopicStockReturn } from '@/app/actions/getTopicStockReturns';

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
