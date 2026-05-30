'use server';

import { getPublicClient } from '@/lib/supabase/service';
import { aggregateTopicWeights, type TopicWeightRow } from '@/lib/investment/topicUtils';

export async function getTopicHeatmapData(): Promise<TopicWeightRow[]> {
    const supabase = getPublicClient();

    // 取全局最新 data_date（與 getAllHoldings 同一邏輯）
    const { data: latestRowRaw } = await supabase
        .from('etf_holdings_snapshot')
        .select('data_date')
        .order('data_date', { ascending: false })
        .limit(1)
        .single();

    const canonicalDate = (latestRowRaw as { data_date: string } | null)?.data_date ?? null;
    if (!canonicalDate) return [];

    const [topicsResult, assignmentsResult, holdingsResult] = await Promise.all([
        supabase.from('stock_topics').select('topic_id, name, short_name, color'),
        supabase.from('stock_topic_assignments').select('stock_code, topic_id'),
        supabase
            .from('etf_holdings_snapshot')
            .select('stock_code, weight')
            .eq('data_date', canonicalDate),
    ]);

    const topics = ((topicsResult.data ?? []) as { topic_id: string; name: string | null; short_name: string | null; color: string | null }[]).map(t => ({
        topic_id: t.topic_id,
        name: t.name ?? '',
        short_name: t.short_name ?? '',
        color: t.color ?? '#6366f1',
    }));

    const assignments = (assignmentsResult.data ?? []) as { stock_code: string; topic_id: string }[];

    const holdings = ((holdingsResult.data ?? []) as { stock_code: string; weight: number | null }[]).map(h => ({
        stock_code: h.stock_code,
        weight: Number(h.weight ?? 0),
    }));

    return aggregateTopicWeights(topics, assignments, holdings);
}
