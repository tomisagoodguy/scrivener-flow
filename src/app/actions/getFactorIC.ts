'use server';

import { unstable_cache } from 'next/cache';
import { getPublicClient } from '@/lib/supabase/service';

export interface FactorICRow {
    factor: string;
    month: string;
    ic_1d: number | null;
    ic_5d: number | null;
    ic_20d: number | null;
}

export async function getFactorIC(factors: string[], months: number): Promise<FactorICRow[]> {
    const cached = unstable_cache(
        async () => {
            const supabase = getPublicClient();
            const clampedMonths = Math.min(months, 24);

            const { data, error } = await supabase
                .from('factor_ic_stats')
                .select('month, factor_name, ic_1d, ic_5d, ic_20d')
                .in('factor_name', factors)
                .order('month', { ascending: false })
                .limit(factors.length * clampedMonths);

            if (error || !data) return [];

            interface Row { factor_name: string; month: string; ic_1d: number | null; ic_5d: number | null; ic_20d: number | null }
            return (data as Row[]).map((row) => ({
                factor: row.factor_name,
                month: row.month,
                ic_1d: row.ic_1d,
                ic_5d: row.ic_5d,
                ic_20d: row.ic_20d,
            }));
        },
        ['factor-ic', factors.join(','), String(months)],
        { revalidate: 3600 },
    );
    return cached();
}
