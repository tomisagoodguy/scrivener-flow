export const revalidate = 3600;

import { unstable_cache } from 'next/cache';
import { getPublicClient } from '@/lib/supabase/service';
import { ETF_REGISTRY, ETF_CODES } from '@/lib/investment/etfRegistry';
import { ArrowLeftIcon, HistoryIcon } from 'lucide-react';
import Link from 'next/link';
import { HistoryTabs } from '@/components/features/investment/HistoryTabs';

// ── 資料層 ────────────────────────────────────────────────────────────────────

/** 所有 ETF 的 weight_history（最近 90 天） */
const fetchAllWeightHistory = unstable_cache(
    async () => {
        const supabase = getPublicClient();
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 90);
        const cutoffStr = cutoff.toISOString().slice(0, 10);

        const { data } = await supabase
            .from('etf_weight_history')
            .select('etf_code, stock_code, stock_name, data_date, weight, rank')
            .in('etf_code', ETF_CODES)
            .gte('data_date', cutoffStr)
            .order('data_date', { ascending: true });

        type WeightRow = { etf_code: string; stock_code: string; stock_name: string; data_date: string; weight: number; rank: number };
        return (data ?? []) as WeightRow[];
    },
    ['weight-history'],
    { revalidate: 3600 },
);

/** 跨 ETF 共識比例趨勢：從 etf_stock_overlap 聚合 */
const fetchOverlapTrend = unstable_cache(
    async () => {
        const supabase = getPublicClient();
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 90);
        const cutoffStr = cutoff.toISOString().slice(0, 10);

        const { data } = await supabase
            .from('etf_stock_overlap')
            .select('data_date, etf_count, stock_code')
            .gte('data_date', cutoffStr)
            .order('data_date', { ascending: true });

        if (!data || data.length === 0) return [];

        type OverlapRow = { data_date: string; etf_count: number; stock_code: string };
        const byDate = new Map<string, { total: number; shared2: number; shared3: number; shared5: number; shared7: number }>();
        for (const row of data as OverlapRow[]) {
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
    ['overlap-trend'],
    { revalidate: 3600 },
);

// ── 頁面 ──────────────────────────────────────────────────────────────────────

export default async function InvestmentHistoryPage() {
    const [weightHistory, overlapTrend] = await Promise.all([
        fetchAllWeightHistory(),
        fetchOverlapTrend(),
    ]);

    // 從 weightHistory 抓出所有股票清單（依出現頻率排序）
    const stockFreq = new Map<string, { name: string; count: number }>();
    for (const row of weightHistory) {
        const code = row.stock_code as string;
        const existing = stockFreq.get(code);
        if (existing) {
            existing.count++;
        } else {
            stockFreq.set(code, { name: row.stock_name as string, count: 1 });
        }
    }
    const stockList = Array.from(stockFreq.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .map(([code, v]) => ({ code, name: v.name }));

    const totalDates = new Set(weightHistory.map(r => r.data_date as string)).size;

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
                weightHistory={weightHistory as WeightHistoryRow[]}
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
