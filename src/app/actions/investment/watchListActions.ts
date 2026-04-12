'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { PREDEFINED_STRATEGIES, type Strategy } from './watchListConstants';

const WATCH_LIST_LIMIT = 50;

export interface WatchListActionResult {
    success: boolean;
    error?: string;
}

/**
 * 新增自選股
 * - 自動查詢公司名稱
 * - 強制 50 筆上限
 * - 重複加入回傳錯誤
 */
export async function addWatchStock(
    stockId: string,
    strategies: Strategy[] = []
): Promise<WatchListActionResult> {
    const sid = stockId.trim();
    if (!sid) return { success: false, error: '股票代碼不可為空' };

    // 驗證策略標籤
    const validStrategies = strategies.filter((s) =>
        (PREDEFINED_STRATEGIES as readonly string[]).includes(s)
    );

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: '請先登入' };

        // 檢查上限
        const { count } = await supabase
            .from('watch_list')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id);

        if ((count ?? 0) >= WATCH_LIST_LIMIT) {
            return { success: false, error: `自選股上限為 ${WATCH_LIST_LIMIT} 支` };
        }

        // 查詢公司簡稱
        let companyName = '';
        const { data: nameData } = await supabase
            .from('stock_basic_info')
            .select('name_short')
            .eq('stock_code', sid)
            .limit(1);
        if (nameData?.[0]?.name_short) {
            companyName = nameData[0].name_short;
        }

        // 若 stock_basic_info 沒有，嘗試從 etf_holdings_snapshot 取名稱
        if (!companyName) {
            const { data: etfData } = await supabase
                .from('etf_holdings_snapshot')
                .select('stock_name')
                .eq('stock_code', sid)
                .limit(1);
            if (etfData?.[0]?.stock_name) {
                companyName = etfData[0].stock_name;
            }
        }

        const { error } = await supabase.from('watch_list').insert({
            user_id: user.id,
            stock_id: sid,
            name: companyName,
            strategies: validStrategies,
        });

        if (error) {
            if (error.code === '23505') {
                return { success: false, error: '該股票已在清單中' };
            }
            throw error;
        }

        revalidatePath('/investment/bare-k');
        revalidatePath('/investment/watch-list');
        return { success: true };
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '新增失敗';
        return { success: false, error: msg };
    }
}

/**
 * 刪除自選股
 */
export async function removeWatchStock(stockId: string): Promise<WatchListActionResult> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: '請先登入' };

        const { error } = await supabase
            .from('watch_list')
            .delete()
            .eq('user_id', user.id)
            .eq('stock_id', stockId);

        if (error) throw error;

        revalidatePath('/investment/bare-k');
        revalidatePath('/investment/watch-list');
        return { success: true };
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '刪除失敗';
        return { success: false, error: msg };
    }
}

/**
 * 更新策略標籤
 */
export async function updateWatchStrategies(
    stockId: string,
    strategies: Strategy[]
): Promise<WatchListActionResult> {
    const validStrategies = strategies.filter((s) =>
        (PREDEFINED_STRATEGIES as readonly string[]).includes(s)
    );

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: '請先登入' };

        const { error } = await supabase
            .from('watch_list')
            .update({ strategies: validStrategies })
            .eq('user_id', user.id)
            .eq('stock_id', stockId);

        if (error) throw error;

        revalidatePath('/investment/bare-k');
        revalidatePath('/investment/watch-list');
        return { success: true };
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '更新失敗';
        return { success: false, error: msg };
    }
}

