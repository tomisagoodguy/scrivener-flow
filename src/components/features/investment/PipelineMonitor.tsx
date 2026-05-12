import { createClient } from '@/lib/supabase/server';
import { ETF_REGISTRY } from '@/lib/investment/etfRegistry';
import { CheckCircle2Icon, AlertTriangleIcon, XCircleIcon, ActivityIcon, ExternalLinkIcon } from 'lucide-react';

function getSourceUrl(etf_code: string, dataSource: string): string {
    if (dataSource === 'fhtrust') {
        return 'https://www.ezmoney.com.tw/ETF/Fund/Info?fundCode=49YTW';
    }
    // pocket.tw URL 用不含 'A' 的代碼
    return `https://www.pocket.tw/etf/tw/${etf_code}/fundholding`;
}

interface EtfStatus {
    etf_code: string;
    name: string;
    color: string;
    dataSource: string;
    latest_date: string | null;
    last_updated: string | null;
    staleDays: number;
}

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

function getStatusLevel(staleDays: number): 'ok' | 'warn' | 'error' | 'unknown' {
    if (staleDays < 0) return 'unknown';
    if (staleDays <= 1) return 'ok';
    if (staleDays <= 3) return 'warn';
    return 'error';
}

function StatusIcon({ level }: { level: ReturnType<typeof getStatusLevel> }) {
    if (level === 'ok') return <CheckCircle2Icon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
    if (level === 'warn') return <AlertTriangleIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
    if (level === 'error') return <XCircleIcon className="w-3.5 h-3.5 text-red-500 shrink-0" />;
    return <span className="w-3.5 h-3.5 rounded-full bg-slate-300 shrink-0 inline-block" />;
}

export async function PipelineMonitor() {
    const supabase = await createClient();

    const { data: snapshotRows } = await supabase
        .from('etf_holdings_snapshot')
        .select('etf_code, data_date, updated_at')
        .order('data_date', { ascending: false });

    // 每支 ETF 取最新一筆
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
            last_updated: row?.created_at ?? null,
            staleDays,
        };
    });

    const errorCount = statuses.filter(s => s.staleDays >= 4).length;
    const warnCount = statuses.filter(s => s.staleDays === 2 || s.staleDays === 3).length;
    const unknownCount = statuses.filter(s => s.staleDays < 0).length;

    const overallLevel =
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
        <details className="relative group">
            <summary
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border cursor-pointer select-none list-none transition-colors ${badgeColor}`}
                title="查看各 ETF 爬蟲狀態"
            >
                <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor} ${overallLevel === 'ok' ? 'animate-pulse' : ''}`} />
                <ActivityIcon className="w-3.5 h-3.5" />
                {overallLabel}
            </summary>

            {/* 展開面板 */}
            <div className="absolute right-0 top-full mt-2 z-50 w-80 glass-card rounded-2xl border border-white/50 shadow-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                        ETF Pipeline 狀態
                    </span>
                    <span className="text-xs text-slate-400">每日 22:00 自動更新</span>
                </div>

                <div className="space-y-1.5">
                    {statuses.map(s => {
                        const level = getStatusLevel(s.staleDays);
                        const dateLabel = s.latest_date
                            ? s.latest_date.slice(5).replace('-', '/')   // "YYYY-MM-DD" → "MM/DD"
                            : '—';
                        const staleLabel =
                            s.staleDays < 0 ? '無資料' :
                            s.staleDays === 0 ? '今日' :
                            s.staleDays === 1 ? '1交易日' :
                            `${s.staleDays} 交易日`;

                        const sourceUrl = getSourceUrl(s.etf_code, s.dataSource);
                        return (
                            <div key={s.etf_code} className="flex items-center gap-2 py-1">
                                <StatusIcon level={level} />
                                <span
                                    className="w-1.5 h-4 rounded-sm shrink-0"
                                    style={{ backgroundColor: s.color }}
                                />
                                <a
                                    href={sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-slate-700 dark:text-slate-300 flex-1 truncate hover:underline hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 min-w-0"
                                >
                                    <span className="truncate">{s.etf_code.replace('A', '')} {s.name.replace('主動', '')}</span>
                                    <ExternalLinkIcon className="w-2.5 h-2.5 shrink-0 opacity-50" />
                                </a>
                                <span className="text-xs text-slate-400 font-mono whitespace-nowrap">
                                    {dateLabel}
                                </span>
                                <span className={`text-xs font-medium whitespace-nowrap ${
                                    level === 'ok' ? 'text-emerald-600 dark:text-emerald-400' :
                                    level === 'warn' ? 'text-amber-600 dark:text-amber-400' :
                                    level === 'error' ? 'text-red-600 dark:text-red-400' :
                                    'text-slate-400'
                                }`}>
                                    {staleLabel}
                                </span>
                            </div>
                        );
                    })}
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1"><CheckCircle2Icon className="w-3 h-3 text-emerald-500" /> 正常 (≤1天)</span>
                        <span className="flex items-center gap-1"><AlertTriangleIcon className="w-3 h-3 text-amber-500" /> 延遲 (2-3天)</span>
                        <span className="flex items-center gap-1"><XCircleIcon className="w-3 h-3 text-red-500" /> 異常 (4天+)</span>
                    </div>
                </div>
            </div>
        </details>
    );
}
