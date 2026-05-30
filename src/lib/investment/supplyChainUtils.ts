export interface ChainNode {
    topic_id: string;
    name: string;
    short_name: string;
    group_name: string | null;
    color: string | null;
}

export interface ChainEdge {
    source: string;
    target: string;
}

interface RawEdge {
    source_topic_id: string;
    target_topic_id: string;
}

interface RawTopic {
    topic_id: string;
    name: string;
    short_name: string;
    group_name: string | null;
    color: string | null;
}

/**
 * 從 DB 查詢結果建構供應鏈圖資料：
 * - 只包含出現在至少一條邊中的主題節點（孤立節點不顯示）
 * - 邊轉換為 {source, target} 格式
 */
export function buildSupplyChainGraph(
    topics: RawTopic[],
    edges: RawEdge[],
): { nodes: ChainNode[]; edges: ChainEdge[] } {
    if (edges.length === 0) return { nodes: [], edges: [] };

    const connectedIds = new Set<string>();
    for (const e of edges) {
        connectedIds.add(e.source_topic_id);
        connectedIds.add(e.target_topic_id);
    }

    const topicMap = new Map<string, RawTopic>(topics.map(t => [t.topic_id, t]));

    const nodes: ChainNode[] = Array.from(connectedIds)
        .map(id => {
            const t = topicMap.get(id);
            if (!t) return null;
            return {
                topic_id: t.topic_id,
                name: t.name,
                short_name: t.short_name,
                group_name: t.group_name,
                color: t.color,
            };
        })
        .filter((n): n is ChainNode => n !== null);

    // If source/target topic is unknown, still include the edge
    const chainEdges: ChainEdge[] = edges.map(e => ({
        source: e.source_topic_id,
        target: e.target_topic_id,
    }));

    // Ensure unknown-topic nodes are still added (from edge-only perspective)
    for (const id of connectedIds) {
        if (!topicMap.has(id) && !nodes.find(n => n.topic_id === id)) {
            nodes.push({ topic_id: id, name: id, short_name: id, group_name: null, color: null });
        }
    }

    return { nodes, edges: chainEdges };
}
