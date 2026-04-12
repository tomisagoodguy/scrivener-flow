import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export interface WatchListEntry {
    id: string;
    stock_id: string;
    name: string;
    strategies: string[];
    created_at: string;
    summary: BareKSummary | null;
}

export interface BareKSummary {
    stock_id: string;
    name: string;
    last_price: number;
    change_pct: number;
    dist_260_pct: number | null;
    signals: {
        hit260: boolean;
        low_vol: boolean;
        margin_ok: boolean;
        rev_9max: boolean;
        trust_ok: boolean;
    };
    last_yoy: number | null;
    last_mom: number | null;
    last_margin: number | null;
    last_big_chg: number | null;
    last_pr_rank: number | null;
}

/**
 * GET /api/investment/bare-k
 * 回傳目前使用者的 watch_list + 各股最新 summary
 */
export async function GET() {
    try {
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 取自選股清單
        const { data: watchList, error: wlError } = await supabase
            .from('watch_list')
            .select('id, stock_id, name, strategies, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true });

        if (wlError) throw wlError;
        if (!watchList || watchList.length === 0) {
            return NextResponse.json([]);
        }

        const stockIds = watchList.map((w) => w.stock_id);

        // 各股最新快照 summary（只取最新一筆）
        const summaryMap = new Map<string, BareKSummary>();
        await Promise.all(
            stockIds.map(async (sid) => {
                const { data } = await supabase
                    .from('bare_k_snapshots')
                    .select('summary')
                    .eq('stock_id', sid)
                    .order('date', { ascending: false })
                    .limit(1);
                if (data?.[0]?.summary) {
                    summaryMap.set(sid, data[0].summary as BareKSummary);
                }
            })
        );

        const result: WatchListEntry[] = watchList.map((w) => ({
            id: w.id,
            stock_id: w.stock_id,
            name: w.name,
            strategies: w.strategies ?? [],
            created_at: w.created_at,
            summary: summaryMap.get(w.stock_id) ?? null,
        }));

        return NextResponse.json(result);
    } catch (error) {
        console.error('[GET /api/investment/bare-k]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
