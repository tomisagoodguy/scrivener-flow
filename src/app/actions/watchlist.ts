'use server';

import { createClient } from '@/lib/supabase/server';
import { CustomWatchlistItem } from '@/types';

export async function getWatchlist(): Promise<CustomWatchlistItem[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('custom_watchlist')
        .select('id, user_id, stock_code, label, created_at')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[watchlist] getWatchlist error:', error.message);
        return [];
    }
    return (data ?? []) as CustomWatchlistItem[];
}

export async function addToWatchlist(
    stockCode: string,
    label: string = '自選',
): Promise<{ success: boolean; duplicate: boolean; error?: string }> {
    const supabase = await createClient();
    const { error } = await supabase
        .from('custom_watchlist')
        .insert({ stock_code: stockCode.trim().toUpperCase(), label });

    if (error) {
        // Postgres unique violation code
        if (error.code === '23505') {
            return { success: false, duplicate: true };
        }
        console.error('[watchlist] addToWatchlist error:', error.message);
        return { success: false, duplicate: false, error: error.message };
    }
    return { success: true, duplicate: false };
}

export async function removeFromWatchlist(
    stockCode: string,
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();
    const { error } = await supabase
        .from('custom_watchlist')
        .delete()
        .eq('stock_code', stockCode.trim().toUpperCase());

    if (error) {
        console.error('[watchlist] removeFromWatchlist error:', error.message);
        return { success: false, error: error.message };
    }
    return { success: true };
}
