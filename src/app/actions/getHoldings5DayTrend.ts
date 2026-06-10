'use server';

import { createClient } from '@/lib/supabase/server';
import {
    computeDailyDiff,
    computeCumulativeDiff,
    type SnapshotDay,
    type SnapshotHolding,
} from '@/lib/investment/holdingsTrendUtils';

export type {
    Holdings5DayTrendResult,
    DailyDiffItem,
    CumulativeDiffItem,
    CumulativeDiffEntry,
    SnapshotDay,
    SnapshotHolding,
} from '@/lib/investment/holdingsTrendUtils';

export async function getHoldings5DayTrend(etfCode: string) {
    const supabase = await createClient();

    const { data: dateRows } = await supabase
        .from('etf_holdings_snapshot')
        .select('data_date')
        .eq('etf_code', etfCode)
        .order('data_date', { ascending: false })
        .limit(5);

    const distinctDates = [...new Set((dateRows ?? []).map(r => r.data_date as string))].sort();

    if (distinctDates.length < 2) {
        return { insufficient: true, dailyDiff: [], cumulativeDiff: [], dates: [] };
    }

    const { data: holdingRows } = await supabase
        .from('etf_holdings_snapshot')
        .select('data_date, stock_code, stock_name, weight, rank')
        .eq('etf_code', etfCode)
        .in('data_date', distinctDates)
        .order('data_date', { ascending: true })
        .order('weight', { ascending: false });

    const snapshotMap = new Map<string, SnapshotHolding[]>();
    for (const row of holdingRows ?? []) {
        const date = row.data_date as string;
        if (!snapshotMap.has(date)) snapshotMap.set(date, []);
        snapshotMap.get(date)!.push({
            stock_code: row.stock_code as string,
            stock_name: row.stock_name as string | null,
            weight: row.weight as number | null,
            rank: row.rank as number | null,
        });
    }

    const snapshots: SnapshotDay[] = distinctDates.map(date => ({
        date,
        holdings: snapshotMap.get(date) ?? [],
    }));

    return {
        insufficient: false,
        dailyDiff: computeDailyDiff(snapshots),
        cumulativeDiff: computeCumulativeDiff(snapshots),
        dates: distinctDates,
    };
}
