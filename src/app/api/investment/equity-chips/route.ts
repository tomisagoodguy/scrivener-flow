import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export interface EquityChipStock {
    stock_code: string;
    stock_name: string | null;
    chip_score: number;
    big_holder_pct_change: number | null;
    shareholders_change_rate: number | null;
}

/**
 * GET /api/investment/equity-chips
 *
 * 回傳最新一期 equity_distribution_stats，依籌碼分數排序（好→壞）。
 * chip_score = big_holder_pct_change - shareholders_change_rate
 * （大戶增加為正貢獻；散戶減少即 shareholders_change_rate 為負，取負號後變正貢獻）
 */
export async function GET() {
    try {
        const supabase = await createClient();

        const { data: latestRow } = await supabase
            .from('equity_distribution_stats')
            .select('snapshot_date')
            .order('snapshot_date', { ascending: false })
            .limit(1)
            .single();

        if (!latestRow) return NextResponse.json([]);

        const { data, error } = await supabase
            .from('equity_distribution_stats')
            .select('stock_code, stock_name, big_holder_pct_change, shareholders_change_rate')
            .eq('snapshot_date', latestRow.snapshot_date);

        if (error) throw error;

        const scored: EquityChipStock[] = (data ?? []).map((row) => ({
            stock_code: row.stock_code,
            stock_name: row.stock_name,
            big_holder_pct_change: row.big_holder_pct_change,
            shareholders_change_rate: row.shareholders_change_rate,
            chip_score: 0,
        }));

        // 排序邏輯：大戶增加（主訊號）DESC，nulls 最後；散戶減少（副訊號）ASC，nulls 最後
        scored.sort((a, b) => {
            const aB = a.big_holder_pct_change;
            const bB = b.big_holder_pct_change;
            if (aB !== bB) {
                if (aB === null) return 1;
                if (bB === null) return -1;
                return bB - aB;
            }
            const aR = a.shareholders_change_rate;
            const bR = b.shareholders_change_rate;
            if (aR === null) return 1;
            if (bR === null) return -1;
            return aR - bR;
        });

        return NextResponse.json(scored);
    } catch (err: unknown) {
        console.error('equity-chips API error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
