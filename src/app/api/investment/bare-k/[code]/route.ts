import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export interface BareKSnapshot {
    stock_id: string;
    date: string;
    ohlcv: Array<{
        date: string;
        o: number | null;
        h: number | null;
        l: number | null;
        c: number | null;
        v: number | null;
        change_pct: number | null;
    }>;
    mas: {
        ma5: Array<{ date: string; value: number | null }>;
        ma20: Array<{ date: string; value: number | null }>;
        ma60: Array<{ date: string; value: number | null }>;
        ma120: Array<{ date: string; value: number | null }>;
        h260: Array<{ date: string; value: number | null }>;
    };
    signals: Array<{
        date: string;
        hit260: boolean;
        low_vol: boolean;
        margin_ok: boolean;
        rev_9max: boolean;
        trust_ok: boolean;
    }>;
    margin: Array<{ date: string; rate: number }>;
    revenue: Array<{ date: string; yoy: number; mom: number }>;
    inv_chips: Array<{
        date: string;
        big_chg: number;
        small_chg: number;
        pr_rank: number;
    }>;
    summary: {
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
    };
}

/**
 * GET /api/investment/bare-k/[code]
 * 回傳單股最新裸K六面板快照
 */
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ code: string }> }
) {
    try {
        const { code } = await params;
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data, error } = await supabase
            .from('bare_k_snapshots')
            .select('stock_id, date, ohlcv, mas, signals, margin, revenue, inv_chips, summary')
            .eq('stock_id', code)
            .order('date', { ascending: false })
            .limit(1);

        if (error) throw error;
        if (!data || data.length === 0) {
            return NextResponse.json(null);
        }

        return NextResponse.json(data[0] as BareKSnapshot);
    } catch (error) {
        console.error('[GET /api/investment/bare-k/[code]]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
