import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ETF_CODES = ['00980A', '00981A', '00991A'] as const;

interface WeightHistoryEntry {
    date: string;
    weight: number;
    rank: number;
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
        return NextResponse.json({ error: 'Missing required parameter: code' }, { status: 400 });
    }

    const supabase = await createClient();
    const result: Record<string, WeightHistoryEntry[]> = {
        '00980A': [],
        '00981A': [],
        '00991A': [],
    };

    // 優先從 etf_weight_history 查詢
    const { data: weightHistory, error: weightError } = await supabase
        .from('etf_weight_history')
        .select('etf_code, data_date, weight, rank')
        .in('etf_code', ETF_CODES as unknown as string[])
        .eq('stock_code', code)
        .order('data_date', { ascending: true });

    if (!weightError && weightHistory && weightHistory.length > 0) {
        // 檢查是否有足夠多的日期（避免只有一天的水平線）
        const byEtf: Record<string, WeightHistoryEntry[]> = {};
        for (const row of weightHistory) {
            if (!byEtf[row.etf_code]) byEtf[row.etf_code] = [];
            byEtf[row.etf_code].push({
                date: row.data_date as string,
                weight: row.weight ?? 0,
                rank: row.rank ?? 0,
            });
        }

        // 若各 ETF 都有多於 1 個日期，直接使用
        const hasMultipleDates = Object.values(byEtf).some(arr => arr.length > 1);
        if (hasMultipleDates) {
            for (const [etfCode, entries] of Object.entries(byEtf)) {
                if (etfCode in result) {
                    result[etfCode as keyof typeof result] = entries;
                }
            }
            return NextResponse.json(result);
        }
    }

    // Fallback：從 etf_holdings_snapshot 聚合，補算 rank
    for (const etfCode of ETF_CODES) {
        const { data: snapshots } = await supabase
            .from('etf_holdings_snapshot')
            .select('data_date, weight')
            .eq('etf_code', etfCode)
            .eq('stock_code', code)
            .order('data_date', { ascending: true });

        if (!snapshots || snapshots.length === 0) continue;

        // 取各日期的所有持股計算 rank
        const dates = [...new Set(snapshots.map(s => s.data_date as string))];

        const { data: allHoldings } = await supabase
            .from('etf_holdings_snapshot')
            .select('data_date, stock_code, weight')
            .eq('etf_code', etfCode)
            .in('data_date', dates);

        const dateRankMap: Record<string, number> = {};
        for (const date of dates) {
            const dayHoldings = (allHoldings ?? [])
                .filter(h => h.data_date === date)
                .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));
            const rankIdx = dayHoldings.findIndex(h => h.stock_code === code);
            dateRankMap[date] = rankIdx >= 0 ? rankIdx + 1 : 0;
        }

        result[etfCode] = snapshots.map(s => ({
            date: s.data_date as string,
            weight: s.weight ?? 0,
            rank: dateRankMap[s.data_date as string] ?? 0,
        }));
    }

    return NextResponse.json(result);
}
