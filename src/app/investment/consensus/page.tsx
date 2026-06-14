export const revalidate = 3600;

import { unstable_cache } from 'next/cache';
import { getPublicClient } from '@/lib/supabase/service';
import Link from 'next/link';
import { Suspense } from 'react';
import { ConsensusFilter } from './ConsensusFilter';
import { getEtfMeta } from '@/lib/investment/etfRegistry';
import { formatCoverage, formatAvgWeight } from './consensusMetrics';

// ─── Types ───────────────────────────────────────────────────────────────────

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

interface DivergenceEtfEntry {
    etfid: string;
    fund_name: string;
    diff_shares: number;
}

interface DivergenceRow {
    stock_code: string;
    stock_name: string | null;
    data_date: string;
    buy_etfs: DivergenceEtfEntry[];
    sell_etfs: DivergenceEtfEntry[];
    buy_count: number;
    sell_count: number;
}

// ─── Data Fetchers ────────────────────────────────────────────────────────────

async function fetchConsensus(
    minEtfCount: number,
): Promise<{ data: OverlapRow[]; date: string; activeEtfCount: number }> {
    const cached = unstable_cache(
        async () => {
            const supabase = getPublicClient();

            const { data: latest } = await supabase
                .from('etf_stock_overlap')
                .select('data_date')
                .order('data_date', { ascending: false })
                .limit(1);

            if (!latest || latest.length === 0) return { data: [], date: '', activeEtfCount: 0 };
            const queryDate: string = (latest as { data_date: string }[])[0].data_date;

            // 覆蓋率分母：當日有持股資料的 distinct ETF 數（不寫死，隨爬取結果浮動）
            const { data: activeEtfRows } = await supabase
                .from('etf_holdings_snapshot')
                .select('etf_code')
                .eq('data_date', queryDate);
            const activeEtfCount = new Set(
                ((activeEtfRows ?? []) as { etf_code: string }[]).map((r) => r.etf_code),
            ).size;

            const { data: overlapData, error } = await supabase
                .from('etf_stock_overlap')
                .select('stock_code, data_date, etf_count, total_weight, etf_list, consensus_buy_count, consensus_sell_count')
                .eq('data_date', queryDate)
                .gte('etf_count', minEtfCount)
                .order('etf_count', { ascending: false })
                .order('total_weight', { ascending: false })
                .limit(100);

            if (error || !overlapData) return { data: [], date: queryDate, activeEtfCount };

            type OverlapRaw = { stock_code: string; data_date: string; etf_count: number; total_weight: unknown; etf_list: unknown; consensus_buy_count: number | null; consensus_sell_count: number | null };
            const overlapRows = overlapData as OverlapRaw[];
            const stockCodes = overlapRows.map((r) => r.stock_code);
            const { data: nameData } = await supabase
                .from('etf_holdings_snapshot')
                .select('stock_code, stock_name')
                .in('stock_code', stockCodes)
                .eq('data_date', queryDate);

            const nameMap: Record<string, string> = {};
            for (const row of (nameData ?? []) as { stock_code: string; stock_name: string }[]) {
                nameMap[row.stock_code] = row.stock_name;
            }

            const enriched: OverlapRow[] = overlapRows.map((row) => ({
                stock_code: row.stock_code,
                stock_name: nameMap[row.stock_code] ?? '',
                data_date: row.data_date,
                etf_count: row.etf_count,
                total_weight: Number(row.total_weight),
                etf_list: (row.etf_list as EtfEntry[]) ?? [],
                consensus_buy_count: row.consensus_buy_count ?? 0,
                consensus_sell_count: row.consensus_sell_count ?? 0,
            }));

            return { data: enriched, date: queryDate, activeEtfCount };
        },
        ['consensus', String(minEtfCount)],
        { revalidate: 3600 },
    );
    return cached();
}

async function getDivergenceData(): Promise<{ data: DivergenceRow[]; date: string }> {
    const cached = unstable_cache(
        async () => {
            const supabase = getPublicClient();

            const { data: latest } = await supabase
                .from('etf_stock_divergence')
                .select('data_date')
                .order('data_date', { ascending: false })
                .limit(1);

            if (!latest || latest.length === 0) return { data: [], date: '' };
            const queryDate: string = (latest as { data_date: string }[])[0].data_date;

            const { data, error } = await supabase
                .from('etf_stock_divergence')
                .select('stock_code, stock_name, data_date, buy_etfs, sell_etfs, buy_count, sell_count')
                .eq('data_date', queryDate);

            if (error || !data) return { data: [], date: queryDate };

            type DivRaw = { stock_code: string; stock_name: string | null; data_date: string; buy_etfs: unknown; sell_etfs: unknown; buy_count: number; sell_count: number };
            const sorted = (data as DivRaw[])
                .map((row) => ({
                    stock_code: row.stock_code,
                    stock_name: row.stock_name,
                    data_date: row.data_date,
                    buy_etfs: (row.buy_etfs as DivergenceEtfEntry[]) ?? [],
                    sell_etfs: (row.sell_etfs as DivergenceEtfEntry[]) ?? [],
                    buy_count: row.buy_count,
                    sell_count: row.sell_count,
                }))
                .sort((a, b) => (b.buy_count + b.sell_count) - (a.buy_count + a.sell_count));

            return { data: sorted, date: queryDate };
        },
        ['divergence'],
        { revalidate: 3600 },
    );
    return cached();
}

// ─── Components ───────────────────────────────────────────────────────────────

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

function TabBar({ activeTab, minEtfCount }: { activeTab: string; minEtfCount: number }) {
    const tabs = [
        { key: 'consensus', label: '共識' },
        { key: 'divergence', label: '分歧' },
    ];
    return (
        <div className="flex gap-1">
            {tabs.map((tab) => (
                <Link
                    key={tab.key}
                    href={`/investment/consensus?tab=${tab.key}&min_etf_count=${minEtfCount}`}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        activeTab === tab.key
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                            : 'bg-white/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700/50'
                    }`}
                >
                    {tab.label}
                </Link>
            ))}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ConsensusPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string>>;
}) {
    const params = await searchParams;
    const minEtfCount = parseInt(params.min_etf_count ?? '2', 10);
    const activeTab = params.tab === 'divergence' ? 'divergence' : 'consensus';

    const [consensusResult, divergenceResult] = await Promise.all([
        activeTab === 'consensus' ? fetchConsensus(minEtfCount) : Promise.resolve({ data: [], date: '', activeEtfCount: 0 }),
        activeTab === 'divergence' ? getDivergenceData() : Promise.resolve({ data: [], date: '' }),
    ]);

    const { data: consensusData, date: consensusDate, activeEtfCount } = consensusResult;
    const { data: divergenceData, date: divergenceDate } = divergenceResult;
    const displayDate = activeTab === 'divergence' ? divergenceDate : consensusDate;

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
                            {displayDate
                                ? `資料日期：${displayDate}`
                                : '暫無資料，請先執行 ETF Pipeline 同步資料'}
                            {activeTab === 'consensus' && consensusData.length > 0 && (
                                <>　共 {consensusData.length} 檔股票被 {minEtfCount}+ 位基金經理人同時持有</>
                            )}
                        </p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <TabBar activeTab={activeTab} minEtfCount={minEtfCount} />
                        {activeTab === 'consensus' && (
                            <Suspense fallback={null}>
                                <ConsensusFilter current={minEtfCount} />
                            </Suspense>
                        )}
                    </div>
                </div>
            </div>

            {/* Consensus Tab */}
            {activeTab === 'consensus' && (
                consensusData.length === 0 ? (
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
                    <>
                    {/* 衍生欄位計算說明 */}
                    <div className="glass-card p-5">
                        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
                            衍生欄位計算方式
                        </h2>
                        <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                            <li>
                                <span className="font-semibold text-slate-700 dark:text-slate-300">覆蓋率 %</span>
                                ＝ 持有 ETF 數 ÷ 當日有資料 ETF 數（{activeEtfCount > 0 ? `${activeEtfCount} 支` : '—'}）。已正規化，可跨日比較。
                            </li>
                            <li>
                                <span className="font-semibold text-slate-700 dark:text-slate-300">平均 weight</span>
                                ＝ 合計權重 ÷ 持有 ETF 數，代表對持有它的 ETF 是否為大部位。忽略各 ETF AUM 差異。
                            </li>
                            <li>
                                <span className="font-semibold text-slate-700 dark:text-slate-300">合計權重</span>
                                ＝ 各 ETF weight 直接加總。各 ETF AUM 基數不同，加總無實際比例意義，僅供排序。
                            </li>
                        </ul>
                    </div>
                    <div className="glass-card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/20 dark:border-slate-700/50 bg-white/30 dark:bg-slate-800/30">
                                        <th className="text-left p-4 font-semibold text-slate-600 dark:text-slate-300 w-8">#</th>
                                        <th className="text-left p-4 font-semibold text-slate-600 dark:text-slate-300">股票</th>
                                        <th className="text-center p-4 font-semibold text-slate-600 dark:text-slate-300">持有 ETF 數</th>
                                        <th className="text-right p-4 font-semibold text-slate-600 dark:text-slate-300">覆蓋率 %</th>
                                        <th className="text-right p-4 font-semibold text-slate-600 dark:text-slate-300">平均 weight</th>
                                        <th
                                            className="text-right p-4 font-semibold text-slate-600 dark:text-slate-300"
                                            title="各 ETF AUM 基數不同，加總無實際比例意義，僅供排序"
                                        >
                                            合計權重
                                            <span className="block text-[10px] font-normal text-slate-400 dark:text-slate-500">
                                                （僅供排序）
                                            </span>
                                        </th>
                                        <th className="text-center p-4 font-semibold text-slate-600 dark:text-slate-300">共識動向</th>
                                        <th className="text-left p-4 font-semibold text-slate-600 dark:text-slate-300">持有 ETF</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {consensusData.map((row, idx) => (
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
                                                {formatCoverage(row.etf_count, activeEtfCount)}
                                            </td>
                                            <td className="p-4 text-right font-mono text-slate-700 dark:text-slate-300">
                                                {formatAvgWeight(row.total_weight, row.etf_count)}
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
                    </>
                )
            )}

            {/* Divergence Tab */}
            {activeTab === 'divergence' && (
                divergenceData.length === 0 ? (
                    <div className="glass-card p-12 text-center">
                        <p className="text-slate-400 text-lg">今日無跨 ETF 分歧標的</p>
                        <p className="text-slate-400 text-sm mt-2">
                            Pipeline 尚未偵測到同日買賣方向相反的標的
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
                                        <th className="text-left p-4 font-semibold text-rose-600 dark:text-rose-400">買進 ETF</th>
                                        <th className="text-left p-4 font-semibold text-emerald-600 dark:text-emerald-400">賣出 ETF</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {divergenceData.map((row, idx) => (
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
                                            <td className="p-4">
                                                <div className="flex flex-col gap-1">
                                                    {row.buy_etfs.map((e) => (
                                                        <span key={e.etfid} className="text-rose-600 dark:text-rose-400 text-xs">
                                                            {e.etfid}
                                                            {e.fund_name && (
                                                                <span className="text-slate-500 dark:text-slate-400 ml-1">
                                                                    {e.fund_name}
                                                                </span>
                                                            )}
                                                            <span className="ml-1 font-mono">
                                                                +{Math.round(Math.abs(e.diff_shares) / 1000)}張
                                                            </span>
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col gap-1">
                                                    {row.sell_etfs.map((e) => (
                                                        <span key={e.etfid} className="text-emerald-600 dark:text-emerald-400 text-xs">
                                                            {e.etfid}
                                                            {e.fund_name && (
                                                                <span className="text-slate-500 dark:text-slate-400 ml-1">
                                                                    {e.fund_name}
                                                                </span>
                                                            )}
                                                            <span className="ml-1 font-mono">
                                                                -{Math.round(Math.abs(e.diff_shares) / 1000)}張
                                                            </span>
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            )}
        </div>
    );
}
