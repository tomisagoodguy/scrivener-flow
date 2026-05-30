'use server';

import { getPublicClient } from '@/lib/supabase/service';

export interface TopicHolding {
    stock_code: string;
    stock_name: string;
    etf_code: string;
    weight: number;
}

export async function getTopicHoldings(topicId: string): Promise<TopicHolding[]> {
    const supabase = getPublicClient();

    // Get canonical date
    const { data: latestRowRaw } = await supabase
        .from('etf_holdings_snapshot')
        .select('data_date')
        .order('data_date', { ascending: false })
        .limit(1)
        .single();

    const canonicalDate = (latestRowRaw as { data_date: string } | null)?.data_date ?? null;
    if (!canonicalDate) return [];

    // Get stock codes for this topic
    const { data: assignmentsRaw } = await supabase
        .from('stock_topic_assignments')
        .select('stock_code')
        .eq('topic_id', topicId);

    const assignments = (assignmentsRaw ?? []) as { stock_code: string }[];
    if (assignments.length === 0) return [];

    const codes = assignments.map(a => a.stock_code);

    // Get holdings for those stocks
    const { data: holdingsRaw } = await supabase
        .from('etf_holdings_snapshot')
        .select('stock_code, stock_name, etf_code, weight')
        .eq('data_date', canonicalDate)
        .in('stock_code', codes)
        .order('weight', { ascending: false });

    return ((holdingsRaw ?? []) as {
        stock_code: string;
        stock_name: string | null;
        etf_code: string;
        weight: number | null;
    }[]).map(h => ({
        stock_code: h.stock_code,
        stock_name: h.stock_name ?? '',
        etf_code: h.etf_code,
        weight: Number(h.weight ?? 0),
    }));
}
