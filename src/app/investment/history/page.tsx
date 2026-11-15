export const revalidate = 3600;

import { unstable_cache } from 'next/cache';
import { getPublicClient } from '@/lib/supabase/service';
import { ETF_REGISTRY, ETF_CODES } from '@/lib/investment/etfRegistry';
import { ArrowLeftIcon, HistoryIcon } from 'lucide-react';
import Link from 'next/link';
import { HistoryTabs } from '@/components/features/investment/HistoryTabs';
import { fetchAllRows } from '@/lib/supabase/fetchAllRows';
import { fetchWeightHistory } from '@/lib/investment/weightHistoryData';

// ── 資料層 ────────────────────────────────────────────────────────────────────

const WINDOW_DAYS = 90;
/** 市場交易日基準股（台積電每個交易日都有收盤價） */
const TRADING_DAY_REFERENCE_STOCK = '2330';
const WEIGHT_COLUMNS = 'etf_code, stock_code, stock_name, data_date, weight, rank';

function windowStart(): string {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - WINDOW_DAYS);
    return cutoff.toISOString().slice(0, 10);
}

/** 每支 ETF 最新一天的持股（合計約千列）；90 天歷史改由頁籤按需載入。 */
const fetchLatestHoldings = unstable_cache(
    async (): Promise<WeightHistoryRow[]> => {
        const supabase = getPublicClient();
        const latestDates = await Promise.all(
            ETF_CODES.map(async etfCode => {
                const { data, error } = await supabase
                    .from('etf_holdings_snapshot')
                    .select('data_date')
                    .eq('etf_code', etfCode)
                    .order('data_date', { ascending: false })
                    .limit(1);
                if (error) throw new Error(`etf_holdings_snapshot: ${error.message}`);
                const latest = (data as { data_date: string }[] | null)?.[0];
                return { etfCode, date: latest?.data_date ?? null };
            }),
        );

        // 同一最新日的 ETF 合併成一次查詢（gte 最新日 = 只讀最新日）
        const etfsByDate = new Map<string, string[]>();
        for (const { etfCode, date } of latestDates) {
            if (!date) continue;
            etfsByDate.set(date, [...(etfsByDate.get(date) ?? []), etfCode]);
        }
        const groups = await Promise.all(
            [...etfsByDate].map(([date, etfCodes]) =>
                fetchWeightHistory<WeightHistoryRow>(supabase, { etfCodes, fromDate: date }, WEIGHT_COLUMNS),
            ),
        );
        return groups.flat();
    },
    ['weight-history-latest-v2'],
    { revalidate: 3600 },
);

/** 近 90 天市場交易日數（以基準股收盤價筆數計） */
const fetchTradingDayCount = unstable_cache(
    async (): Promise<number> => {
        const { count, error } = await getPublicClient()
            .from('stock_prices_daily')
            .select('data_date', { count: 'exact', head: true })
            .eq('stock_code', TRADING_DAY_REFERENCE_STOCK)
            .gte('data_date', windowStart());
        if (error) throw new Error(`stock_prices_daily: ${error.message}`);
        return count ?? 0;
    },
    ['trading-day-count-v1'],
    { revalidate: 3600 },
);

/** 跨 ETF 共識比例趨勢：分頁讀完 etf_stock_overlap 近 90 天後聚合 */
const fetchOverlapTrend = unstable_cache(
    async () => {
        const supabase = getPublicClient();
        const cutoffStr = windowStart();

        type OverlapRow = { data_date: string; etf_count: number };
        const data = await fetchAllRows<OverlapRow>('etf_stock_overlap', (from, to) =>
            supabase
                .from('etf_stock_overlap')
                .select('data_date, etf_count')
                .gte('data_date', cutoffStr)
                .order('data_date', { ascending: true })
                .order('stock_code', { ascending: true })
                .range(from, to),
        );

        const byDate = new Map<string, { total: number; shared2: number; shared3: number; shared5: number; shared7: number }>();
        for (const row of data) {
            const d = row.data_date;
            if (!byDate.has(d)) byDate.set(d, { total: 0, shared2: 0, shared3: 0, shared5: 0, shared7: 0 });
            const entry = byDate.get(d)!;
            entry.total++;
            if (row.etf_count >= 2) entry.shared2++;
            if (row.etf_count >= 3) entry.shared3++;
            if (row.etf_count >= 5) entry.shared5++;
            if (row.etf_count >= 7) entry.shared7++;
        }

        return Array.from(byDate.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, v]) => ({
                date,
                total: v.total,
                shared2: v.shared2,
                shared3: v.shared3,
                shared5: v.shared5,
                shared7: v.shared7,
                pct2: v.total > 0 ? Number(((v.shared2 / v.total) * 100).toFixed(1)) : 0,
                pct3: v.total > 0 ? Number(((v.shared3 / v.total) * 100).toFixed(1)) : 0,
                pct5: v.total > 0 ? Number(((v.shared5 / v.total) * 100).toFixed(1)) : 0,
                pct7: v.total > 0 ? Number(((v.shared7 / v.total) * 100).toFixed(1)) : 0,
            }));
    },
    ['overlap-trend-v2'],
    { revalidate: 3600 },
);

// ── 頁面 ──────────────────────────────────────────────────────────────────────

export default async function InvestmentHistoryPage() {
    const [latestHoldings, overlapTrend, totalDates] = await Promise.all([
        fetchLatestHoldings(),
        fetchOverlapTrend(),
        fetchTradingDayCount(),
    ]);

    // 股票清單：依最新一日持有 ETF 家數降序，同數依代碼升冪
    const holders = new Map<string, { name: string; etfs: Set<string> }>();
    for (const row of latestHoldings) {
        const entry = holders.get(row.stock_code) ?? { name: row.stock_name, etfs: new Set<string>() };
        entry.etfs.add(row.etf_code);
        holders.set(row.stock_code, entry);
    }
    const stockList = Array.from(holders.entries())
        .sort((a, b) => b[1].etfs.size - a[1].etfs.size || a[0].localeCompare(b[0]))
        .map(([code, v]) => ({ code, name: v.name }));

    return (
        <div className="container mx-auto py-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="mb-2">
                        <Link
                            href="/investment"
                            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors"
                        >
                            <ArrowLeftIcon className="w-4 h-4" />
                            返回選股池
                        </Link>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                        <HistoryIcon className="w-8 h-8 text-indigo-500" />
                        ETF 持倉歷史統計
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        {ETF_REGISTRY.length} 支主動式 ETF · 近 90 天 · {totalDates} 個交易日
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {ETF_REGISTRY.map(etf => (
                        <span
                            key={etf.code}
                            className="text-xs px-2 py-1 rounded-full font-medium"
                            style={{ backgroundColor: etf.color + '20', color: etf.color, border: `1px solid ${etf.color}60` }}
                        >
                            {etf.shortCode}
                        </span>
                    ))}
                </div>
            </div>

            <HistoryTabs
                latestHoldings={latestHoldings}
                overlapTrend={overlapTrend}
                stockList={stockList}
                etfRegistry={ETF_REGISTRY}
            />
        </div>
    );
}

export interface WeightHistoryRow {
    etf_code: string;
    stock_code: string;
    stock_name: string;
    data_date: string;
    weight: number;
    rank: number;
}
