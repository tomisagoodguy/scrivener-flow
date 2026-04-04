import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

interface QueryOptions {
    /** 要查詢的 table 名稱 */
    table: string;
    /** select 欄位，預設 '*' */
    select?: string;
    /** 排序設定 */
    order?: { column: string; ascending?: boolean };
    /** 是否在 mount 時立即執行，預設 true */
    immediate?: boolean;
}

interface UseSupabaseQueryResult<T> {
    data: T[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

/**
 * 統一 Supabase 查詢樣板，消除重複的 loading/error/data + useEffect 模式。
 *
 * @example
 * const { data: clauses, loading, refetch } = useSupabaseQuery<Clause>({
 *   table: 'contract_clauses',
 *   order: { column: 'usage_count', ascending: false },
 * });
 */
export function useSupabaseQuery<T = Record<string, unknown>>(
    options: QueryOptions
): UseSupabaseQueryResult<T> {
    const supabase = useMemo(() => createClient(), []);
    const { table, select = '*', order, immediate = true } = options;

    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(immediate);
    const [error, setError] = useState<string | null>(null);

    const refetch = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            let query = supabase.from(table).select(select);
            if (order) {
                query = query.order(order.column, { ascending: order.ascending ?? true });
            }
            const { data: result, error: err } = await query;
            if (err) throw err;
            setData((result as T[]) ?? []);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : '查詢失敗';
            setError(msg);
            setData([]);
        } finally {
            setLoading(false);
        }
    }, [table, select, order, supabase]);

    useEffect(() => {
        if (immediate) refetch();
    }, [immediate, refetch]);

    return { data, loading, error, refetch };
}
