import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, Users } from 'lucide-react';

interface EquityRow {
    stock_code: string;
    stock_name: string | null;
    total_shareholders: number | null;
    shareholders_change_rate: number | null;
    big_holder_pct_change: number | null;
    mid_holder_pct_change: number | null;
    whale_holder_pct_change: number | null;
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
    doubleSignalRanking: EquityRow[];
    priceIndicators: Record<string, PriceIndicator>;
}

type SortKey =
    | 'total_shareholders'
    | 'shareholders_change_rate'
    | 'big_holder_pct_change'
    | 'mid_holder_pct_change'
    | 'whale_holder_pct_change'
    | 'it_buy_5d'
    | 'amount';
type SortDir = 'asc' | 'desc';
type Tier = '200' | '400' | '1000';

const TIER_SORT_KEY: Record<Tier, SortKey> = {
    '200': 'mid_holder_pct_change',
    '400': 'big_holder_pct_change',
    '1000': 'whale_holder_pct_change',
};

const DB_SORT_KEYS = new Set<SortKey>([
    'total_shareholders',
    'shareholders_change_rate',
    'big_holder_pct_change',
    'mid_holder_pct_change',
    'whale_holder_pct_change',
]);

async function fetchPriceIndicators(stockCodes: string[]): Promise<Record<string, PriceIndicator>> {
    if (stockCodes.length === 0) return {};
    const supabase = await createClient();

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 310);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const BATCH = 20;
    const batches: string[][] = [];
    for (let i = 0; i < stockCodes.length; i += BATCH) batches.push(stockCodes.slice(i, i + BATCH));

    const batchResults = await Promise.all(
        batches.map(batch =>
            supabase
                .from('stock_prices_daily')
                .select('stock_code, close, amount, it_buy')
                .in('stock_code', batch)
                .gte('data_date', cutoffStr)
                .order('data_date', { ascending: false })
                .limit(batch.length * 220)
        )
    );

    const byCode: Record<string, { close: number; amount: number | null; it_buy: number | null }[]> = {};
    for (const { data } of batchResults) {
        if (!data) continue;
        for (const row of data) {
            if (!byCode[row.stock_code]) byCode[row.stock_code] = [];
            byCode[row.stock_code].push({
                close: Number(row.close),
                amount: row.amount != null ? Number(row.amount) : null,
                it_buy: row.it_buy != null ? Number(row.it_buy) : null,
            });
        }
    }

    const result: Record<string, PriceIndicator> = {};
    for (const [code, prices] of Object.entries(byCode)) {
        if (prices.length === 0) continue;
        const latest = prices[0];

        const prices200 = prices.slice(0, 200);
        const max200 = prices200.reduce((m, p) => Math.max(m, p.close), 0);
        const is_200d_high = prices200.length >= 60 && latest.close >= max200;

        const prices20 = prices.slice(0, 20);
        const max20 = prices20.reduce((m, p) => Math.max(m, p.close), 0);
        const is_20d_high = prices20.length >= 20 && latest.close >= max20;

        const it5 = prices.slice(0, 5).map(p => p.it_buy).filter((v): v is number => v !== null);
        const it_buy_5d = it5.length > 0 ? it5.reduce((s, v) => s + v, 0) : null;

        result[code] = { is_200d_high, is_20d_high, it_buy_5d, amount: latest.amount };
    }

    return result;
}

function applySortToRows(
    rows: EquityRow[],
    sort: SortKey | null,
    dir: SortDir,
    priceIndicators: Record<string, PriceIndicator>
): EquityRow[] {
    if (!sort || DB_SORT_KEYS.has(sort)) return rows;

    return [...rows].sort((a, b) => {
        const aVal = sort === 'it_buy_5d'
            ? (priceIndicators[a.stock_code]?.it_buy_5d ?? null)
            : (priceIndicators[a.stock_code]?.amount ?? null);
        const bVal = sort === 'it_buy_5d'
            ? (priceIndicators[b.stock_code]?.it_buy_5d ?? null)
            : (priceIndicators[b.stock_code]?.amount ?? null);

        if (aVal === null && bVal === null) return 0;
        if (aVal === null) return 1;
        if (bVal === null) return -1;
        return dir === 'asc' ? aVal - bVal : bVal - aVal;
    });
}

async function fetchRankingData(sort: SortKey | null, dir: SortDir, tier: Tier | null): Promise<RankingData | null> {
    const supabase = await createClient();

    const { data: latestRow } = await supabase
        .from('equity_distribution_stats')
        .select('snapshot_date')
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .single();

    if (!latestRow) return null;
    const snapshotDate: string = latestRow.snapshot_date;

    const tierKey = tier ? TIER_SORT_KEY[tier] : null;
    const effectiveSort = sort ?? tierKey;

    // Left: sort by selected tier (or default 400張+)
    const bigSortKey = (effectiveSort && DB_SORT_KEYS.has(effectiveSort)) ? effectiveSort : 'big_holder_pct_change';
    const bigSortAsc = (effectiveSort && DB_SORT_KEYS.has(effectiveSort)) ? dir === 'asc' : false;

    // Right: always sort by retail decline, filter by tier if selected
    let retailQuery = supabase
        .from('equity_distribution_stats')
        .select('stock_code, stock_name, total_shareholders, shareholders_change_rate, big_holder_pct_change, mid_holder_pct_change, whale_holder_pct_change')
        .eq('snapshot_date', snapshotDate)
        .not('shareholders_change_rate', 'is', null)
        .order('shareholders_change_rate', { ascending: true });

    if (tierKey) {
        retailQuery = retailQuery.gt(tierKey, 0);
    }

    const [{ data: bigHolder }, { data: retailDecline }] = await Promise.all([
        supabase
            .from('equity_distribution_stats')
            .select('stock_code, stock_name, total_shareholders, shareholders_change_rate, big_holder_pct_change, mid_holder_pct_change, whale_holder_pct_change')
            .eq('snapshot_date', snapshotDate)
            .gt('big_holder_pct_change', 0)
            .order(bigSortKey, { ascending: bigSortAsc }),
        retailQuery,
    ]);

    const allCodes = [...new Set([
        ...(bigHolder ?? []).map(r => r.stock_code),
        ...(retailDecline ?? []).map(r => r.stock_code),
    ])];
    const priceIndicators = await fetchPriceIndicators(allCodes);

    const sortedBig = applySortToRows((bigHolder ?? []) as EquityRow[], sort, dir, priceIndicators);
    const sortedRetail = applySortToRows((retailDecline ?? []) as EquityRow[], sort, dir, priceIndicators);

    // 雙重信號：大戶持股比例上升(>0) AND 總股東人數下降(<0)
    const doubleSignalRanking = (bigHolder ?? [])
        .filter(row => (row.shareholders_change_rate ?? 0) < 0)
        .sort((a, b) => (b.big_holder_pct_change ?? 0) - (a.big_holder_pct_change ?? 0))
        .slice(0, 10) as EquityRow[];

    return {
        snapshotDate,
        bigHolderRanking: sortedBig,
        retailDeclineRanking: sortedRetail,
        doubleSignalRanking,
        priceIndicators,
    };
}

function DoubleSignalSection({
    rows,
    priceIndicators,
}: {
    rows: EquityRow[];
    priceIndicators: Record<string, PriceIndicator>;
}) {
    if (rows.length === 0) return null;
    const codeList = encodeURIComponent(rows.map(r => r.stock_code).join(','));
    const fromLabel = encodeURIComponent('雙重信號');
    return (
        <div className="glass-card rounded-2xl p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-violet-500/10 rounded-xl flex items-center justify-center">
                    <span className="text-sm font-bold text-violet-600">⚡</span>
                </div>
                <div>
                    <h2 className="font-bold text-gray-800 dark:text-gray-100">
                        雙重信號
                        <span className="ml-2 text-xs font-normal text-violet-500">主力買進 × 散戶出走</span>
                    </h2>
                    <p className="text-xs text-gray-500">同時符合兩條件・籌碼集中最完整訊號・Top {rows.length}</p>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b border-gray-200/60 text-[11px] text-gray-500 uppercase tracking-wide">
                            <th className="text-left py-2 px-2 w-6">#</th>
                            <th className="text-left py-2 px-2">股票</th>
                            <th className="text-right py-2 px-2">股東數</th>
                            <th className="text-right py-2 px-2">人數增減</th>
                            <th className="text-right py-2 px-2">200張+</th>
                            <th className="text-right py-2 px-2">400張+</th>
                            <th className="text-right py-2 px-2">1000張+</th>
                            <th className="text-right py-2 px-2">投信五日</th>
                            <th className="text-right py-2 px-2">成交額</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, i) => {
                            const pi = priceIndicators[row.stock_code];
                            const shrChange = row.shareholders_change_rate;
                            return (
                                <tr key={row.stock_code} className="border-b border-gray-200/60 hover:bg-violet-50/40 transition-all">
                                    <td className="py-2.5 px-2 text-gray-400 font-mono">{i + 1}</td>
                                    <td className="py-2.5 px-2">
                                        <div className="flex items-center gap-1 flex-wrap">
                                            <Link
                                                href={`/investment/stock/${row.stock_code}?from=${fromLabel}&rank=${i + 1}&list=${codeList}`}
                                                className="font-semibold text-gray-800 dark:text-gray-200 hover:text-violet-600 transition-colors"
                                            >
                                                {row.stock_name || row.stock_code}
                                            </Link>
                                            <span className="text-[10px] text-gray-400">{row.stock_code}</span>
                                            {pi && <HighBadge is200d={pi.is_200d_high} is20d={pi.is_20d_high} />}
                                        </div>
                                    </td>
                                    <td className="py-2.5 px-2 text-right text-gray-700 font-mono">
                                        {row.total_shareholders?.toLocaleString() ?? '—'}
                                    </td>
                                    <td className="py-2.5 px-2 text-right font-mono">
                                        {shrChange != null ? (
                                            <span className={shrChange < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                                                {shrChange > 0 ? '+' : ''}{shrChange.toFixed(2)}%
                                            </span>
                                        ) : '—'}
                                    </td>
                                    <td className="py-2.5 px-2 text-right font-mono">
                                        <HolderPctCell value={row.mid_holder_pct_change} positiveGood={true} />
                                    </td>
                                    <td className="py-2.5 px-2 text-right font-mono">
                                        <HolderPctCell value={row.big_holder_pct_change} positiveGood={true} />
                                    </td>
                                    <td className="py-2.5 px-2 text-right font-mono">
                                        <HolderPctCell value={row.whale_holder_pct_change} positiveGood={true} />
                                    </td>
                                    <td className="py-2.5 px-2 text-right font-mono whitespace-nowrap">
                                        {pi?.it_buy_5d != null ? (
                                            <span className={pi.it_buy_5d > 0 ? 'text-rose-600 dark:text-rose-400' : pi.it_buy_5d < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500'}>
                                                {pi.it_buy_5d > 0 ? '+' : ''}{pi.it_buy_5d.toLocaleString()}
                                            </span>
                                        ) : '—'}
                                    </td>
                                    <td className="py-2.5 px-2 text-right font-mono text-gray-600 whitespace-nowrap">
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
        </div>
    );
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

function SortableHeader({
    label,
    sortKey,
    currentSort,
    currentDir,
}: {
    label: string;
    sortKey: SortKey;
    currentSort: SortKey | null;
    currentDir: SortDir;
}) {
    const isActive = currentSort === sortKey;
    const nextDir: SortDir = isActive && currentDir === 'desc' ? 'asc' : 'desc';
    const arrow = isActive ? (currentDir === 'asc' ? ' ↑' : ' ↓') : '';

    return (
        <Link
            href={`?sort=${sortKey}&dir=${nextDir}`}
            className={`whitespace-nowrap hover:text-blue-600 transition-colors cursor-pointer ${isActive ? 'text-blue-600 font-semibold' : ''}`}
        >
            {label}{arrow}
        </Link>
    );
}

function HolderPctCell({ value, positiveGood }: { value: number | null; positiveGood: boolean }) {
    if (value == null) return <span className="text-gray-400">—</span>;
    const isPositive = value > 0;
    const isGood = positiveGood ? isPositive : !isPositive;
    const color = isGood ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400';
    return (
        <span className={`font-semibold ${color}`}>
            {value > 0 ? '+' : ''}{value.toFixed(2)}pp
        </span>
    );
}

function RankingTable({
    rows,
    source,
    priceIndicators,
    currentSort,
    currentDir,
}: {
    rows: EquityRow[];
    source: 'equity' | 'equity-retail';
    priceIndicators: Record<string, PriceIndicator>;
    currentSort: SortKey | null;
    currentDir: SortDir;
}) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-xs">
                <thead>
                    <tr className="border-b border-gray-200/60 text-[11px] text-gray-500 uppercase tracking-wide">
                        <th className="text-left py-2 px-2 w-6">#</th>
                        <th className="text-left py-2 px-2">股票</th>
                        <th className="text-right py-2 px-2">
                            <SortableHeader label="股東數" sortKey="total_shareholders" currentSort={currentSort} currentDir={currentDir} />
                        </th>
                        <th className="text-right py-2 px-2">
                            <SortableHeader label="人數增減" sortKey="shareholders_change_rate" currentSort={currentSort} currentDir={currentDir} />
                        </th>
                        <th className="text-right py-2 px-2">
                            <SortableHeader label="200張+" sortKey="mid_holder_pct_change" currentSort={currentSort} currentDir={currentDir} />
                        </th>
                        <th className="text-right py-2 px-2">
                            <SortableHeader label="400張+" sortKey="big_holder_pct_change" currentSort={currentSort} currentDir={currentDir} />
                        </th>
                        <th className="text-right py-2 px-2">
                            <SortableHeader label="1000張+" sortKey="whale_holder_pct_change" currentSort={currentSort} currentDir={currentDir} />
                        </th>
                        <th className="text-right py-2 px-2">
                            <SortableHeader label="投信五日" sortKey="it_buy_5d" currentSort={currentSort} currentDir={currentDir} />
                        </th>
                        <th className="text-right py-2 px-2">
                            <SortableHeader label="成交額" sortKey="amount" currentSort={currentSort} currentDir={currentDir} />
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => {
                        const shrChangeVal = row.shareholders_change_rate;
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
                                        {row.mid_holder_pct_change != null && row.mid_holder_pct_change > 0 &&
                                         row.big_holder_pct_change != null && row.big_holder_pct_change > 0 &&
                                         row.whale_holder_pct_change != null && row.whale_holder_pct_change > 0 && (
                                            <span className="inline-block ml-0.5 px-1.5 py-0.5 text-[10px] font-bold rounded bg-violet-500 text-white leading-none">
                                                三全↑
                                            </span>
                                        )}
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
                                    <HolderPctCell value={row.mid_holder_pct_change} positiveGood={true} />
                                </td>
                                <td className={`py-2.5 px-2 text-right font-mono ${cellBg}`}>
                                    <HolderPctCell value={row.big_holder_pct_change} positiveGood={true} />
                                </td>
                                <td className={`py-2.5 px-2 text-right font-mono ${cellBg}`}>
                                    <HolderPctCell value={row.whale_holder_pct_change} positiveGood={true} />
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

export default async function EquityDistributionPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string>>;
}) {
    const params = await searchParams;

    const sortRaw = params.sort as SortKey | undefined;
    const validSortKeys: SortKey[] = [
        'total_shareholders', 'shareholders_change_rate',
        'big_holder_pct_change', 'mid_holder_pct_change', 'whale_holder_pct_change',
        'it_buy_5d', 'amount',
    ];
    const sort: SortKey | null = sortRaw && validSortKeys.includes(sortRaw) ? sortRaw : null;
    const dir: SortDir = params.dir === 'asc' ? 'asc' : 'desc';
    const tierRaw = params.tier;
    const tier: Tier | null = tierRaw === '200' || tierRaw === '400' || tierRaw === '1000' ? tierRaw : null;

    const data = await fetchRankingData(sort, dir, tier);

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

                {/* Tier filter */}
                <div className="flex items-center gap-2 mb-5">
                    <span className="text-xs text-gray-500">同步排序：</span>
                    {([
                        { label: '預設', value: null },
                        { label: '200張+', value: '200' },
                        { label: '400張+', value: '400' },
                        { label: '1000張+', value: '1000' },
                    ] as { label: string; value: Tier | null }[]).map(({ label, value }) => {
                        const isActive = tier === value;
                        const href = value ? `?tier=${value}` : '?';
                        return (
                            <Link
                                key={label}
                                href={href}
                                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                                    isActive
                                        ? 'bg-violet-500 text-white border-violet-500'
                                        : 'bg-white/60 text-gray-600 border-gray-200 hover:border-violet-400 hover:text-violet-600'
                                }`}
                            >
                                {label}
                            </Link>
                        );
                    })}
                </div>

                {!data ? (
                    <div className="glass-card rounded-2xl p-12 text-center">
                        <p className="text-gray-400">尚無資料，每週一更新</p>
                    </div>
                ) : (
                    <>
                    <DoubleSignalSection rows={data.doubleSignalRanking} priceIndicators={data.priceIndicators} />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* 主力買進 */}
                        <div className="glass-card rounded-2xl p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 bg-rose-500/10 rounded-xl flex items-center justify-center">
                                    <TrendingUp size={16} className="text-rose-600" />
                                </div>
                                <div>
                                    <h2 className="font-bold text-gray-800 dark:text-gray-100">主力買進</h2>
                                    <p className="text-xs text-gray-500">大戶持股比例增加 · 共 {data.bigHolderRanking.length} 檔</p>
                                </div>
                            </div>
                            {data.bigHolderRanking.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-6">尚無資料</p>
                            ) : (
                                <RankingTable
                                    rows={data.bigHolderRanking}
                                    source="equity"
                                    priceIndicators={data.priceIndicators}
                                    currentSort={sort}
                                    currentDir={dir}
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
                                    source="equity-retail"
                                    priceIndicators={data.priceIndicators}
                                    currentSort={sort}
                                    currentDir={dir}
                                />
                            )}
                        </div>
                    </div>
                    </>
                )}
            </div>
        </div>
    );
}
