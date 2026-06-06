'use server';

import { createClient } from '@/lib/supabase/server';

export interface RetailSentiment {
    date: string;
    small_holder_chg_12w: number | null;
    small_holder_z_score: number | null;
    is_retail_accelerating: boolean | null;
    is_odd_lot_fragmented: boolean | null;
}

export async function getRetailSentiment(): Promise<RetailSentiment | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('market_breadth_daily')
        .select('date, small_holder_chg_12w, small_holder_z_score, is_retail_accelerating, is_odd_lot_fragmented')
        .not('small_holder_chg_12w', 'is', null)
        .order('date', { ascending: false })
        .limit(1)
        .single();

    if (error || !data) return null;
    return data as RetailSentiment;
}
