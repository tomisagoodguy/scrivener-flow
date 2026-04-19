import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, Users } from 'lucide-react';

interface EquityRow {
    stock_code: string;
    stock_name: string | null;
    total_shareholders: number | null;
    shareholders_change_rate: number | null;
    big_holder_pct_change: number | null;
}

interface PriceIndicator {
    is_200d_high: boolean;
    is_20d_high: boolean;
    it_buy_5d: number | null;
    amount: number | null;
}

interface RankingData {
    snapshotDate: string;
    bigHolderRanking: EquityRow[];
    retailDeclineRanking: EquityRow[];
    priceIndicators: Record<string, PriceIndicator>;
}

async function fetchPriceIndicators(stockCodes: string[]): Promise<Record<string, PriceIndicator>> {
    if (stockCodes.length === 0) return {};
    const supabase = await createClient();

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 310);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const { data } = await supabase
        .from('stock_prices_daily')
        .select('stock_code, close, amount, it_buy')
        .in('stock_code', stockCodes)
        .gte('data_date', cutoffStr)
        .order('data_date', { ascending: false });

    if (!data) return {};

    const byCode: Record<string, { close: number; amount: number | null; it_buy: number | null }[]> = {};
    for (const row of data) {
        if (!byCode[row.stock_code]) byCode[row.stock_code] = [];
        byCode[row.stock_code].push({
            close: Number(row.close),
            amount: row.amount != null ? Number(row.amount) : null,
            it_buy: row.it_buy != null ? Number(row.it_buy) : null,
        });
    }

    const result: Record<string, PriceIndicator> = {};
    for (const [code, prices] of Object.entries(byCode)) {
        if (prices.length === 0) continue;
        const latest = prices[0];

        // 200日高：DB 歷史不足 200 天時，用全部可用天數（最少需 60 天）
        const prices200 = prices.slice(0, 200);
        const max200 = prices200.reduce((m, p) => Math.max(m, p.close), 0);
        const is_200d_high = prices200.length >= 60 && latest.close >= max200;

        // 20日高（需至少 20 天）
        const prices20 = prices.slice(0, 20);
        const max20 = prices20.reduce((m, p) => Math.max(m, p.close), 0);
        const is_20d_high = prices20.length >= 20 && latest.close >= max20;

        const it5 = prices.slice(0, 5).map(p => p.it_buy).filter((v): v is number => v !== null);
        const it_buy_5d = it5.length > 0 ? it5.reduce((s, v) => s + v, 0) : null;

        result[code] = { is_200d_high, is_20d_high, it_buy_5d, amount: latest.amount };
    }

    return result;
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

    const allCodes = [...new Set([
        ...(bigHolder ?? []).map(r => r.stock_code),
        ...(retailDecline ?? []).map(r => r.stock_code),
    ])];
    const priceIndicators = await fetchPriceIndicators(allCodes);

    return {
        snapshotDate,
        bigHolderRanking: (bigHolder ?? []) as EquityRow[],
        retailDeclineRanking: (retailDecline ?? []) as EquityRow[],
        priceIndicators,
    };
}

function HighBadge({ is200d, is20d }: { is200d: boolean; is20d: boolean }) {
    if (is200d) return (
        <span className="inline-block ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded bg-rose-500 text-white leading-none">
            200日
        </span>
    );
    if (is20d) return (
        <span className="inline-block ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded bg-orange-400 text-white leading-none">
            20日
        </span>
    );
    return null;
}

function RankingTable({
    rows,
    changeKey,
    changeLabel,
    positiveGood,
    source,
    priceIndicators,
}: {
    rows: EquityRow[];
    changeKey: 'big_holder_pct_change' | 'shareholders_change_rate';
    changeLabel: string;
    positiveGood: boolean;
    source: 'equity' | 'equity-retail';
    priceIndicators: Record<string, PriceIndicator>;
}) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-xs">
                <thead>
                    <tr className="border-b border-gray-200/60 text-[11px] text-gray-500 uppercase tracking-wide">
                        <th className="text-left py-2 px-2 w-6">#</th>
                        <th className="text-left py-2 px-2">股票</th>
                        <th className="text-right py-2 px-2 whitespace-nowrap">股東數</th>
                        <th className="text-right py-2 px-2 whitespace-nowrap">股東變化</th>
                        <th className="text-right py-2 px-2 whitespace-nowrap">{changeLabel}</th>
                        <th className="text-right py-2 px-2 whitespace-nowrap">投信五日</th>
                        <th className="text-right py-2 px-2 whitespace-nowrap">成交額</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => {
                        const changeVal = row[changeKey];
                        const shrChangeVal = row.shareholders_change_rate;
                        const isPositive = (changeVal ?? 0) > 0;
                        const isGood = positiveGood ? isPositive : !isPositive;
                        const changeColor = isGood
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400';
                        const pi = priceIndicators[row.stock_code];

                        const cellBg = pi?.is_200d_high
                            ? 'bg-rose-100'
                            : pi?.is_20d_high
                            ? 'bg-amber-100'
                            : '';

                        return (
                            <tr key={row.stock_code} className="border-b border-gray-200/60 hover:brightness-95 transition-all">
                                <td className={`py-2.5 px-2 text-gray-400 font-mono ${cellBg}`}>{i + 1}</td>
                                <td className={`py-2.5 px-2 ${cellBg}`}>
                                    <div className="flex items-center gap-1 flex-wrap">
                                        <Link
                                            href={`/investment/stock/${row.stock_code}?source=${source}`}
                                            className="font-semibold text-gray-800 dark:text-gray-200 hover:text-blue-600 transition-colors text-xs"
                                        >
                                            {row.stock_name || row.stock_code}
                                        </Link>
                                        <span className="text-[10px] text-gray-400">{row.stock_code}</span>
                                        {pi && <HighBadge is200d={pi.is_200d_high} is20d={pi.is_20d_high} />}
                                    </div>
                                </td>
                                <td className={`py-2.5 px-2 text-right text-gray-700 dark:text-gray-300 font-mono ${cellBg}`}>
                                    {row.total_shareholders != null
                                        ? row.total_shareholders.toLocaleString()
                                        : '—'}
                                </td>
                                <td className={`py-2.5 px-2 text-right font-mono ${cellBg}`}>
                                    {shrChangeVal != null ? (
                                        <span className={shrChangeVal < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                                            {shrChangeVal > 0 ? '+' : ''}{shrChangeVal.toFixed(2)}%
                                        </span>
                                    ) : '—'}
                                </td>
                                <td className={`py-2.5 px-2 text-right font-mono ${cellBg}`}>
                                    {changeVal != null ? (
                                        <span className={`font-semibold ${changeColor}`}>
                                            {changeKey === 'big_holder_pct_change'
                                                ? `${changeVal > 0 ? '+' : ''}${changeVal.toFixed(2)}pp`
                                                : `${changeVal > 0 ? '+' : ''}${changeVal.toFixed(2)}%`}
                                        </span>
                                    ) : '—'}
                                </td>
                                <td className={`py-2.5 px-2 text-right font-mono whitespace-nowrap ${cellBg}`}>
                                    {pi?.it_buy_5d != null ? (
                                        <span className={pi.it_buy_5d > 0 ? 'text-rose-600 dark:text-rose-400' : pi.it_buy_5d < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500'}>
                                            {pi.it_buy_5d > 0 ? '+' : ''}{pi.it_buy_5d.toLocaleString()}
                                        </span>
                                    ) : '—'}
                                </td>
                                <td className={`py-2.5 px-2 text-right font-mono text-gray-600 dark:text-gray-400 whitespace-nowrap ${cellBg}`}>
                                    {pi?.amount != null && pi.amount > 0
                                        ? `${(pi.amount / 1e8).toFixed(1)}億`
                                        : '—'}
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
            <div className="max-w-screen-2xl mx-auto">
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
                                    source="equity"
                                    priceIndicators={data.priceIndicators}
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
                                    source="equity-retail"
                                    priceIndicators={data.priceIndicators}
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
