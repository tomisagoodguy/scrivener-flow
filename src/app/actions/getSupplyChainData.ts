'use server';

import { getPublicClient } from '@/lib/supabase/service';
import { buildSupplyChainGraph } from '@/lib/investment/supplyChainUtils';

export async function getSupplyChainData() {
    const supabase = getPublicClient();

    const [topicsResult, edgesResult] = await Promise.all([
        supabase.from('stock_topics').select('topic_id, name, short_name, group_name, color'),
        supabase.from('topic_chain_edges').select('source_topic_id, target_topic_id'),
    ]);

    const topics = ((topicsResult.data ?? []) as {
        topic_id: string;
        name: string | null;
        short_name: string | null;
        group_name: string | null;
        color: string | null;
    }[]).map(t => ({
        topic_id: t.topic_id,
        name: t.name ?? '',
        short_name: t.short_name ?? '',
        group_name: t.group_name ?? null,
        color: t.color ?? null,
    }));

    const edges = (edgesResult.data ?? []) as { source_topic_id: string; target_topic_id: string }[];

    return buildSupplyChainGraph(topics, edges);
}
