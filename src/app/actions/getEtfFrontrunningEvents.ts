'use server';

import { createClient } from '@/lib/supabase/server';

export interface FrontrunningEvent {
    etf_code: string;
    stock_code: string;
    event_date: string;
    delta_shares: number;
    delta_pct: number | null;
    is_new_position: boolean | null;
    r_t0: number | null;
    r_t1: number | null;
    r_t2: number | null;
}

export async function getEtfFrontrunningEvents(): Promise<FrontrunningEvent[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('etf_frontrunning_stats')
        .select('etf_code, stock_code, event_date, delta_shares, delta_pct, is_new_position, r_t0, r_t1, r_t2')
        .order('event_date', { ascending: false })
        .limit(500);

    if (error) {
        console.error('[getEtfFrontrunningEvents] query error:', error.message);
        return [];
    }

    return (data ?? []) as FrontrunningEvent[];
}
