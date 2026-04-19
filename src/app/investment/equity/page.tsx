import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, TrendingDown, Users } from 'lucide-react';

interface EquityRow {
    stock_code: string;
    stock_name: string | null;
    total_shareholders: number | null;
    shareholders_change_rate: number | null;
    big_holder_pct_change: number | null;
}

interface RankingData {
    snapshotDate: string;
    bigHolderRanking: EquityRow[];
    retailDeclineRanking: EquityRow[];
}

async function fetchRankingData(): Promise<RankingData | null> {
    const supabase = await createClient();

    const { data: latestRow } = await supabase
        .from('equity_distribution_stats')
        .select('snapshot_date')
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .single();

    if (!latestRow) return null;
    const snapshotDate: string = latestRow.snapshot_date;

    const [{ data: bigHolder }, { data: retailDecline }] = await Promise.all([
        supabase
            .from('equity_distribution_stats')
            .select('stock_code, stock_name, total_shareholders, shareholders_change_rate, big_holder_pct_change')
            .eq('snapshot_date', snapshotDate)
            .not('big_holder_pct_change', 'is', null)
            .order('big_holder_pct_change', { ascending: false }),
        supabase
            .from('equity_distribution_stats')
            .select('stock_code, stock_name, total_shareholders, shareholders_change_rate, big_holder_pct_change')
            .eq('snapshot_date', snapshotDate)
            .not('shareholders_change_rate', 'is', null)
            .order('shareholders_change_rate', { ascending: true }),
    ]);

    return {
        snapshotDate,
        bigHolderRanking: (bigHolder ?? []) as EquityRow[],
        retailDeclineRanking: (retailDecline ?? []) as EquityRow[],
    };
}

function RankingTable({
    rows,
    changeKey,
    changeLabel,
    positiveGood,
}: {
    rows: EquityRow[];
    changeKey: 'big_holder_pct_change' | 'shareholders_change_rate';
    changeLabel: string;
    positiveGood: boolean;
}) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-gray-200/60 text-xs text-gray-500 uppercase tracking-wide">
                        <th className="text-left py-2.5 px-3 w-8">#</th>
                        <th className="text-left py-2.5 px-3">股票</th>
                        <th className="text-right py-2.5 px-3 whitespace-nowrap">總股東人數</th>
                        <th className="text-right py-2.5 px-3 whitespace-nowrap">股東人數變化率</th>
                        <th className="text-right py-2.5 px-3 whitespace-nowrap">{changeLabel}</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => {
                        const changeVal = row[changeKey];
                        const shrChangeVal = row.shareholders_change_rate;
                        const isPositive = (changeVal ?? 0) > 0;
                        const isGood = positiveGood ? isPositive : !isPositive;
                        // 台股慣例：紅色代表上漲/利多，綠色代表下跌/利空
                        const changeColor = isGood
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400';

                        return (
                            <tr
                                key={row.stock_code}
                                className="border-b border-gray-100/60 hover:bg-white/50 transition-colors"
                            >
                                <td className="py-3 px-3 text-gray-400 font-mono text-xs">{i + 1}</td>
                                <td className="py-3 px-3">
                                    <Link
                                        href={`/investment/stock/${row.stock_code}?source=equity`}
                                        className="font-semibold text-gray-800 dark:text-gray-200 hover:text-blue-600 transition-colors"
                                    >
                                        {row.stock_name || row.stock_code}
                                    </Link>
                                    <span className="ml-1.5 text-xs text-gray-400">{row.stock_code}</span>
                                </td>
                                <td className="py-3 px-3 text-right text-gray-700 dark:text-gray-300 font-mono">
                                    {row.total_shareholders != null
                                        ? row.total_shareholders.toLocaleString()
                                        : '—'}
                                </td>
                                <td className="py-3 px-3 text-right font-mono">
                                    {shrChangeVal != null ? (
                                        <span className={shrChangeVal < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                                            {shrChangeVal > 0 ? '+' : ''}{shrChangeVal.toFixed(2)}%
                                        </span>
                                    ) : '—'}
                                </td>
                                <td className="py-3 px-3 text-right font-mono">
                                    {changeVal != null ? (
                                        <span className={`font-semibold ${changeColor}`}>
                                            {changeKey === 'big_holder_pct_change'
                                                ? `${changeVal > 0 ? '+' : ''}${changeVal.toFixed(2)}pp`
                                                : `${changeVal > 0 ? '+' : ''}${changeVal.toFixed(2)}%`}
                                        </span>
                                    ) : '—'}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export default async function EquityDistributionPage() {
    const data = await fetchRankingData();

    return (
        <div className="min-h-screen p-6 animate-fade-in">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <Link
                        href="/investment"
                        className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-blue-600 bg-white/60 hover:bg-white border border-gray-200 hover:border-blue-300 px-2.5 py-1.5 rounded-lg transition-all"
                    >
                        <ArrowLeft size={14} /> 返回
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                            籌碼排行榜
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            E 經理人 ETF 成分股 · 股東分散表（TDCC）· 每週一更新
                            {data && (
                                <span className="ml-2 text-blue-500 font-medium">
                                    資料日期：{data.snapshotDate}
                                </span>
                            )}
                        </p>
                    </div>
                </div>

                {!data ? (
                    <div className="glass-card rounded-2xl p-12 text-center">
                        <p className="text-gray-400">尚無資料，每週一更新</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* 主力買進 */}
                        <div className="glass-card rounded-2xl p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 bg-rose-500/10 rounded-xl flex items-center justify-center">
                                    <TrendingUp size={16} className="text-rose-600" />
                                </div>
                                <div>
                                    <h2 className="font-bold text-gray-800 dark:text-gray-100">主力買進</h2>
                                    <p className="text-xs text-gray-500">大戶持股比例增加（400 張以上）· 共 {data.bigHolderRanking.length} 檔</p>
                                </div>
                            </div>
                            {data.bigHolderRanking.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-6">尚無資料</p>
                            ) : (
                                <RankingTable
                                    rows={data.bigHolderRanking}
                                    changeKey="big_holder_pct_change"
                                    changeLabel="大戶持股變化"
                                    positiveGood={true}
                                />
                            )}
                        </div>

                        {/* 散戶減少 */}
                        <div className="glass-card rounded-2xl p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 bg-rose-500/10 rounded-xl flex items-center justify-center">
                                    <Users size={16} className="text-rose-600" />
                                </div>
                                <div>
                                    <h2 className="font-bold text-gray-800 dark:text-gray-100">散戶減少</h2>
                                    <p className="text-xs text-gray-500">總股東人數減少 · 共 {data.retailDeclineRanking.length} 檔</p>
                                </div>
                            </div>
                            {data.retailDeclineRanking.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-6">尚無資料</p>
                            ) : (
                                <RankingTable
                                    rows={data.retailDeclineRanking}
                                    changeKey="shareholders_change_rate"
                                    changeLabel="股東人數變化率"
                                    positiveGood={false}
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
