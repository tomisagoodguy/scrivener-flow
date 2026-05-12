import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Suspense } from 'react';
import { ConsensusFilter } from './ConsensusFilter';
import { getEtfMeta } from '@/lib/investment/etfRegistry';

interface EtfEntry {
    etf_code: string;
    weight: number;
}

interface OverlapRow {
    stock_code: string;
    stock_name: string;
    data_date: string;
    etf_count: number;
    total_weight: number;
    etf_list: EtfEntry[];
    consensus_buy_count: number;
    consensus_sell_count: number;
}

async function fetchConsensus(minEtfCount: number): Promise<{ data: OverlapRow[]; date: string }> {
    const supabase = await createClient();

    // 取最新有資料日期
    const { data: latest } = await supabase
        .from('etf_stock_overlap')
        .select('data_date')
        .order('data_date', { ascending: false })
        .limit(1);

    if (!latest || latest.length === 0) return { data: [], date: '' };
    const queryDate: string = latest[0].data_date;

    const { data: overlapData, error } = await supabase
        .from('etf_stock_overlap')
        .select('stock_code, data_date, etf_count, total_weight, etf_list, consensus_buy_count, consensus_sell_count')
        .eq('data_date', queryDate)
        .gte('etf_count', minEtfCount)
        .order('etf_count', { ascending: false })
        .order('total_weight', { ascending: false })
        .limit(100);

    if (error || !overlapData) return { data: [], date: queryDate };

    // 補充股票名稱
    const stockCodes = overlapData.map((r) => r.stock_code);
    const { data: nameData } = await supabase
        .from('etf_holdings_snapshot')
        .select('stock_code, stock_name')
        .in('stock_code', stockCodes)
        .eq('data_date', queryDate);

    const nameMap: Record<string, string> = {};
    for (const row of nameData ?? []) {
        nameMap[row.stock_code] = row.stock_name;
    }

    const enriched: OverlapRow[] = overlapData.map((row) => ({
        stock_code: row.stock_code,
        stock_name: nameMap[row.stock_code] ?? '',
        data_date: row.data_date,
        etf_count: row.etf_count,
        total_weight: Number(row.total_weight),
        etf_list: (row.etf_list as EtfEntry[]) ?? [],
        consensus_buy_count: row.consensus_buy_count ?? 0,
        consensus_sell_count: row.consensus_sell_count ?? 0,
    }));

    return { data: enriched, date: queryDate };
}

function EtfBadge({ etfCode }: { etfCode: string }) {
    const color = getEtfMeta(etfCode)?.color ?? '#64748b';
    return (
        <span
            className="inline-block px-2 py-0.5 rounded-lg text-xs font-medium"
            style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}55` }}
        >
            {etfCode}
        </span>
    );
}

export default async function ConsensusPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string>>;
}) {
    const params = await searchParams;
    const minEtfCount = parseInt(params.min_etf_count ?? '2', 10);
    const { data, date } = await fetchConsensus(minEtfCount);

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header */}
            <div className="glass-card p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                            🎯 經理人共識持股
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                            {date
                                ? `資料日期：${date}　共 ${data.length} 檔股票被 ${minEtfCount}+ 位基金經理人同時持有`
                                : '暫無資料，請先執行 ETF Pipeline 同步資料'}
                        </p>
                    </div>
                    <Suspense fallback={null}>
                        <ConsensusFilter current={minEtfCount} />
                    </Suspense>
                </div>
            </div>

            {/* Table */}
            {data.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <p className="text-slate-400 text-lg">尚無共識持股資料</p>
                    <p className="text-slate-400 text-sm mt-2">
                        請先執行{' '}
                        <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">
                            uv run python ETF/main.py
                        </code>{' '}
                        同步資料
                    </p>
                </div>
            ) : (
                <div className="glass-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/20 dark:border-slate-700/50 bg-white/30 dark:bg-slate-800/30">
                                    <th className="text-left p-4 font-semibold text-slate-600 dark:text-slate-300 w-8">#</th>
                                    <th className="text-left p-4 font-semibold text-slate-600 dark:text-slate-300">股票</th>
                                    <th className="text-center p-4 font-semibold text-slate-600 dark:text-slate-300">持有 ETF 數</th>
                                    <th className="text-right p-4 font-semibold text-slate-600 dark:text-slate-300">合計權重</th>
                                    <th className="text-center p-4 font-semibold text-slate-600 dark:text-slate-300">共識動向</th>
                                    <th className="text-left p-4 font-semibold text-slate-600 dark:text-slate-300">持有 ETF</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((row, idx) => (
                                    <tr
                                        key={row.stock_code}
                                        className="border-b border-white/10 dark:border-slate-700/30 hover:bg-white/40 dark:hover:bg-slate-800/30 transition-colors"
                                    >
                                        <td className="p-4 text-slate-400 dark:text-slate-500">{idx + 1}</td>
                                        <td className="p-4">
                                            <Link
                                                href={`/investment/stock/${row.stock_code}`}
                                                className="flex flex-col group"
                                            >
                                                <span className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                    {row.stock_code}
                                                </span>
                                                {row.stock_name && (
                                                    <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                        {row.stock_name}
                                                    </span>
                                                )}
                                            </Link>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span
                                                className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                                                    row.etf_count >= 4
                                                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                                        : row.etf_count >= 3
                                                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                                                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                                }`}
                                            >
                                                {row.etf_count}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right font-mono text-slate-700 dark:text-slate-300">
                                            {row.total_weight.toFixed(2)}%
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                {row.consensus_buy_count > 0 && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
                                                        {row.consensus_buy_count}買
                                                    </span>
                                                )}
                                                {row.consensus_sell_count > 0 && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                        {row.consensus_sell_count}賣
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-wrap gap-1">
                                                {row.etf_list.map((e) => (
                                                    <EtfBadge key={e.etf_code} etfCode={e.etf_code} />
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
