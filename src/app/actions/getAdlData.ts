'use server';

import { createClient } from '@/lib/supabase/server';

export interface AdlRecord {
    date: string;
    ups: number | null;
    downs: number | null;
    net: number | null;
    adl: number | null;
    adr: number | null;
    adl_ma5: number | null;
    adl_ma60: number | null;
    adr_ma5: number | null;
    adr_ma60: number | null;
}

export type CrossStatus = 'golden' | 'death' | 'none';

export interface AdlData {
    records: AdlRecord[];
    crossStatus: CrossStatus;
    latestDate: string;
    latestAdl: number | null;
}

export async function getAdlData(): Promise<AdlData> {
    const supabase = await createClient();

    const since = new Date();
    since.setDate(since.getDate() - 180);
    const sinceStr = since.toISOString().slice(0, 10);

    const { data } = await supabase
        .from('market_breadth_daily')
        .select('*')
        .gte('date', sinceStr)
        .order('date', { ascending: true });

    const records = (data ?? []) as AdlRecord[];

    if (records.length === 0) {
        return { records: [], crossStatus: 'none', latestDate: '', latestAdl: null };
    }

    const latest = records[records.length - 1];
    const prev = records.length >= 2 ? records[records.length - 2] : null;

    let crossStatus: CrossStatus = 'none';
    if (latest.adl_ma5 !== null && latest.adl_ma60 !== null) {
        const ma5Now = latest.adl_ma5;
        const ma60Now = latest.adl_ma60;
        const ma5Prev = prev?.adl_ma5 ?? null;
        const ma60Prev = prev?.adl_ma60 ?? null;

        if (ma5Prev !== null && ma60Prev !== null) {
            if (ma5Now >= ma60Now && ma5Prev < ma60Prev) crossStatus = 'golden';
            else if (ma5Now < ma60Now && ma5Prev >= ma60Prev) crossStatus = 'death';
        }
    }

    return {
        records,
        crossStatus,
        latestDate: latest.date,
        latestAdl: latest.adl,
    };
}
