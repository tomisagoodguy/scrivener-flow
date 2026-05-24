import { createClient } from '@/lib/supabase/server';
import { RevenueLab } from '@/components/features/investment/RevenueLab';
import { ArrowLeftIcon } from 'lucide-react';
import Link from 'next/link';
import { ETF_CODES } from '@/lib/investment/etfRegistry';
import { Holding } from '@/types/investment';

async function getUnionHoldings(): Promise<Holding[]> {
    const supabase = await createClient();

    const { data: dateRow } = await supabase
        .from('etf_holdings_snapshot')
        .select('data_date')
        .in('etf_code', ETF_CODES)
        .order('data_date', { ascending: false })
        .limit(1);

    const targetDate = dateRow?.[0]?.data_date ?? null;
    if (!targetDate) return [];

    const { data: allHoldings } = await supabase
        .from('etf_holdings_snapshot')
        .select('etf_code, stock_code, stock_name, weight')
        .in('etf_code', ETF_CODES)
        .eq('data_date', targetDate)
        .order('weight', { ascending: false });

    if (!allHoldings) return [];

    // 取聯集，重複個股取最高 weight
    const map = new Map<string, Holding>();
    for (const h of allHoldings) {
        const existing = map.get(h.stock_code);
        if (!existing || (h.weight ?? 0) > (existing.weight ?? 0)) {
            map.set(h.stock_code, {
                stock_id: h.stock_code,
                stock_code: h.stock_code,
                stock_name: h.stock_name,
                shares: 0,
                weight: h.weight ?? 0,
                price: null,
                change_percent: null,
                amount: null,
                currency: null,
                is_disposal: false,
            });
        }
    }

    return Array.from(map.values());
}

export default async function RevenueLabPage() {
    const currentHoldings = await getUnionHoldings();

    return (
        <div className="container mx-auto py-8 space-y-8">
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
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Revenue Lab
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    勝率回測 · 營收熱力圖 · 跨 {ETF_CODES.length} 支 ETF 聯集持股
                </p>
            </div>

            <RevenueLab currentHoldings={currentHoldings} />
        </div>
    );
}
