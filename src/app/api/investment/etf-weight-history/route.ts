import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ETF_CODES } from '@/lib/investment/etfRegistry';
import { fetchWeightHistory } from '@/lib/investment/weightHistoryData';

interface WeightHistoryEntry {
    date: string;
    weight: number;
    rank: number;
}

interface WeightHistoryDbRow {
    etf_code: string;
    data_date: string;
    weight: number | null;
    rank: number | null;
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
        return NextResponse.json({ error: 'Missing required parameter: code' }, { status: 400 });
    }

    const supabase = await createClient();
    const result: Record<string, WeightHistoryEntry[]> = Object.fromEntries(
        ETF_CODES.map(c => [c, []])
    );

    let rows: WeightHistoryDbRow[];
    try {
        rows = await fetchWeightHistory<WeightHistoryDbRow>(
            supabase,
            { etfCodes: [...ETF_CODES], stockCode: code },
            'etf_code, data_date, weight, rank',
        );
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: message }, { status: 500 });
    }

    for (const row of rows) {
        result[row.etf_code]?.push({
            date: row.data_date,
            weight: row.weight ?? 0,
            rank: row.rank ?? 0,
        });
    }

    return NextResponse.json(result);
}
