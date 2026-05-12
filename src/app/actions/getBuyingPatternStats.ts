'use server';

import { getServiceClient } from '@/lib/supabase/service';

export interface PatternStats {
    patternType: string;
    n: number;
    avgReturns: Record<string, number>;
    winRates: Record<string, number>;
}

interface PatternRow {
    pattern_type: string;
    future_returns: Record<string, number> | null;
}

const HORIZONS = ['1', '2', '3', '5', '7', '10', '15', '20', '25', '30'];

export async function getBuyingPatternStats(): Promise<PatternStats[]> {
    const supabase = getServiceClient();

    const { data, error } = await supabase
        .from('etf_buying_patterns')
        .select('pattern_type, future_returns')
        .not('future_returns', 'is', null);

    if (error) {
        console.error('[getBuyingPatternStats] query error:', error.message);
        return [];
    }

    const rows = (data ?? []) as PatternRow[];
    return _aggregate(rows);
}

function _aggregate(rows: PatternRow[]): PatternStats[] {
    // Group rows by pattern_type
    const grouped: Record<string, PatternRow[]> = {};
    for (const row of rows) {
        (grouped[row.pattern_type] ??= []).push(row);
    }

    return Object.entries(grouped).map(([patternType, events]) => {
        const n = events.length;
        const avgReturns: Record<string, number> = {};
        const winRates: Record<string, number> = {};

        for (const horizon of HORIZONS) {
            const values: number[] = [];
            for (const e of events) {
                const val = e.future_returns?.[horizon];
                if (val !== undefined && val !== null) {
                    values.push(val);
                }
            }
            if (values.length === 0) continue;
            const sum = values.reduce((a, b) => a + b, 0);
            avgReturns[horizon] = sum / values.length;
            winRates[horizon] = values.filter(v => v > 0).length / values.length;
        }

        return { patternType, n, avgReturns, winRates };
    });
}
