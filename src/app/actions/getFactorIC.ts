'use server';

import { createClient } from '@/lib/supabase/server';

export interface FactorICRow {
    factor: string;
    month: string;
    ic_1d: number | null;
    ic_5d: number | null;
    ic_20d: number | null;
}

export async function getFactorIC(factors: string[], months: number): Promise<FactorICRow[]> {
    const supabase = await createClient();
    const clampedMonths = Math.min(months, 24);

    const { data, error } = await supabase
        .from('factor_ic_stats')
        .select('month, factor_name, ic_1d, ic_5d, ic_20d')
        .in('factor_name', factors)
        .order('month', { ascending: false })
        .limit(factors.length * clampedMonths);

    if (error || !data) return [];

    return data.map((row) => ({
        factor: row.factor_name as string,
        month: row.month as string,
        ic_1d: row.ic_1d as number | null,
        ic_5d: row.ic_5d as number | null,
        ic_20d: row.ic_20d as number | null,
    }));
}
