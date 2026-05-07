import React from 'react';
import { getServiceClient } from '@/lib/supabase/service';
import { PreMarketGuide } from './PreMarketGuide';
import { PreMarketGuide981A } from './PreMarketGuide981A';
import { OverlapStrip, type OverlapStock } from './OverlapStrip';

// ── Overlap detection (single pass over both datasets) ────────────────────────

async function fetchOverlap(): Promise<OverlapStock[]> {
    const supabase = getServiceClient();

    const [{ data: flowRowRaw }, { data: latestDateRow }] = await Promise.all([
        supabase
            .from('etf_flow_daily')
            .select('inflow')
            .gt('totals->>stocks_count', '0')
            .order('data_date', { ascending: false })
            .limit(1)
            .single(),
        supabase
            .from('etf_diff_logs')
            .select('data_date')
            .eq('etf_code', '00981A')
            .order('data_date', { ascending: false })
            .limit(1)
            .single(),
    ]);

    const flowRow = flowRowRaw as { inflow: Record<string, unknown>[] } | null;
    if (!flowRow || !latestDateRow) return [];

    const latestDate = (latestDateRow as { data_date: string }).data_date;

    const { data: diffLogs } = await supabase
        .from('etf_diff_logs')
        .select('stock_code, diff_shares')
        .eq('etf_code', '00981A')
        .eq('data_date', latestDate)
        .in('change_type', ['BUY', 'IN'])
        .order('diff_shares', { ascending: false });

    if (!diffLogs || diffLogs.length === 0) return [];

    type DiffRow = { stock_code: string; diff_shares: number };
    const yaojieSorted = (diffLogs as DiffRow[]).map(l => l.stock_code);
    const yaojieSet = new Set(yaojieSorted);

    const consensusBuys = ((flowRow.inflow as Record<string, unknown>[]) ?? [])
        .filter(s => (s.etf_count as number) >= 3)
        .sort((a, b) => (b.total_nt as number) - (a.total_nt as number));

    const consensusList = consensusBuys.map(s => s.stock_code as string).join(',');
    const yaojielist = yaojieSorted.join(',');

    const result: OverlapStock[] = [];
    consensusBuys.forEach((s, i) => {
        const code = s.stock_code as string;
        const yaojieIdx = yaojieSorted.indexOf(code);
        if (yaojieSet.has(code) && yaojieIdx !== -1) {
            result.push({
                code,
                name: s.stock_name as string,
                consensusRank: i + 1,
                yaojieRank: yaojieIdx + 1,
                consensusList,
                yaojielist,
            });
        }
    });

    return result;
}

// ── Server Component ───────────────────────────────────────────────────────────

export async function PreMarketGuidePair() {
    const overlap = await fetchOverlap();

    return (
        <div className="space-y-3">
            {overlap.length > 0 && <OverlapStrip stocks={overlap} />}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <React.Suspense fallback={<div className="h-24 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" />}>
                    <PreMarketGuide />
                </React.Suspense>
                <React.Suspense fallback={<div className="h-24 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" />}>
                    <PreMarketGuide981A />
                </React.Suspense>
            </div>
        </div>
    );
}
