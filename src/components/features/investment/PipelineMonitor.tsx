import { createClient } from '@/lib/supabase/server';
import { ETF_REGISTRY } from '@/lib/investment/etfRegistry';
import { PipelineMonitorClient, type EtfStatus, type OverallLevel } from './PipelineMonitorClient';

function countTradingDays(from: Date, to: Date): number {
    let count = 0;
    const d = new Date(from);
    d.setHours(0, 0, 0, 0);
    const end = new Date(to);
    end.setHours(0, 0, 0, 0);
    while (d < end) {
        d.setDate(d.getDate() + 1);
        const day = d.getDay();
        if (day !== 0 && day !== 6) count++;
    }
    return count;
}

export async function PipelineMonitor() {
    const supabase = await createClient();

    const { data: snapshotRows } = await supabase
        .from('etf_holdings_snapshot')
        .select('etf_code, data_date, updated_at')
        .order('data_date', { ascending: false });

    const latestByEtf: Record<string, { data_date: string; created_at: string }> = {};
    for (const row of snapshotRows ?? []) {
        if (!latestByEtf[row.etf_code]) {
            latestByEtf[row.etf_code] = { data_date: row.data_date, created_at: row.updated_at };
        }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const statuses: EtfStatus[] = ETF_REGISTRY.map(entry => {
        const row = latestByEtf[entry.code];
        let staleDays = -1;
        if (row?.data_date) {
            const d = new Date(row.data_date);
            d.setHours(0, 0, 0, 0);
            staleDays = countTradingDays(d, today);
        }
        return {
            etf_code: entry.code,
            name: entry.name,
            color: entry.color,
            dataSource: entry.dataSource,
            latest_date: row?.data_date ?? null,
            staleDays,
        };
    });

    const errorCount = statuses.filter(s => s.staleDays >= 4).length;
    const warnCount = statuses.filter(s => s.staleDays === 2 || s.staleDays === 3).length;
    const unknownCount = statuses.filter(s => s.staleDays < 0).length;

    const overallLevel: OverallLevel =
        errorCount > 0 ? 'error' :
        warnCount > 0 ? 'warn' :
        unknownCount === statuses.length ? 'unknown' : 'ok';

    const overallLabel =
        overallLevel === 'ok' ? '爬蟲正常' :
        overallLevel === 'warn' ? `${warnCount} 支延遲` :
        overallLevel === 'error' ? `${errorCount} 支異常` : '狀態未知';

    const badgeColor =
        overallLevel === 'ok' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' :
        overallLevel === 'warn' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' :
        overallLevel === 'error' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' :
        'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';

    const dotColor =
        overallLevel === 'ok' ? 'bg-emerald-500' :
        overallLevel === 'warn' ? 'bg-amber-500' :
        overallLevel === 'error' ? 'bg-red-500' : 'bg-slate-400';

    return (
        <PipelineMonitorClient
            statuses={statuses}
            overallLevel={overallLevel}
            overallLabel={overallLabel}
            badgeColor={badgeColor}
            dotColor={dotColor}
        />
    );
}
