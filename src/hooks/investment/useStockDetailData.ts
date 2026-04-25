'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface HoldingEtf {
    etf_code: string;
    weight: number;
    prev_weight?: number | null;
}

export interface SignalRow {
    signal_type: string;
    strength: 1 | 2 | 3;
    etf_codes: string[];
    metadata: Record<string, unknown>;
}

export interface DiffRow {
    etf_code: string;
    data_date: string;
    change_type: string;
    curr_weight: number | null;
    diff_weight: number | null;
}

export interface AumRow {
    etf_code: string;
    aum_100m: number;
    inflow_share?: number | null;
}

export interface EquityRow {
    big_holder_pct: number | null;
    big_holder_pct_change: number | null;
    snapshot_date: string;
}

export interface StockDetailData {
    holdings: HoldingEtf[];
    signals: SignalRow[];
    diffs: DiffRow[];
    equity: EquityRow | null;
    aum: AumRow[];
}

const EMPTY_DATA: StockDetailData = { holdings: [], signals: [], diffs: [], equity: null, aum: [] };

export function useStockDetailData(stockCode: string | null) {
    const [data, setData] = useState<StockDetailData | null>(null);
    const [loadingBlocks, setLoadingBlocks] = useState<Set<string>>(new Set());
    const [errors, setErrors] = useState<Set<string>>(new Set());
    const [, startTransition] = useTransition();

    const setBlockState = useCallback((block: string, ok: boolean) => {
        startTransition(() => {
            setLoadingBlocks(prev => { const n = new Set(prev); n.delete(block); return n; });
            if (!ok) setErrors(prev => new Set([...prev, block]));
        });
    }, []);

    useEffect(() => {
        if (!stockCode) return;
        setData(null);
        setErrors(new Set());
        setLoadingBlocks(new Set(['holdings', 'signals', 'diffs', 'equity', 'aum']));

        const supabase = createClient();

        supabase
            .from('etf_holdings_snapshot')
            .select('etf_code, weight, data_date')
            .eq('stock_code', stockCode)
            .order('data_date', { ascending: false })
            .limit(50)
            .then(({ data: rows, error }) => {
                if (error) { setBlockState('holdings', false); return; }
                const byEtf: Record<string, HoldingEtf> = {};
                for (const r of rows ?? []) {
                    if (!byEtf[r.etf_code]) byEtf[r.etf_code] = { etf_code: r.etf_code, weight: r.weight };
                }
                setData(prev => ({ ...EMPTY_DATA, ...prev, holdings: Object.values(byEtf) }));
                setBlockState('holdings', true);
            });

        supabase
            .from('etf_signals')
            .select('signal_type, strength, etf_codes, metadata')
            .eq('stock_code', stockCode)
            .order('data_date', { ascending: false })
            .limit(10)
            .then(({ data: rows, error }) => {
                if (error) { setBlockState('signals', false); return; }
                setData(prev => ({ ...EMPTY_DATA, ...prev, signals: (rows ?? []) as SignalRow[] }));
                setBlockState('signals', true);
            });

        supabase
            .from('etf_diff_logs')
            .select('etf_code, data_date, change_type, curr_weight, diff_weight')
            .eq('stock_code', stockCode)
            .order('data_date', { ascending: false })
            .limit(20)
            .then(({ data: rows, error }) => {
                if (error) { setBlockState('diffs', false); return; }
                setData(prev => ({ ...EMPTY_DATA, ...prev, diffs: (rows ?? []) as DiffRow[] }));
                setBlockState('diffs', true);
            });

        supabase
            .from('equity_distribution_stats')
            .select('big_holder_pct, big_holder_pct_change, snapshot_date')
            .eq('stock_code', stockCode)
            .order('snapshot_date', { ascending: false })
            .limit(1)
            .then(({ data: rows, error }) => {
                if (error) { setBlockState('equity', false); return; }
                setData(prev => ({ ...EMPTY_DATA, ...prev, equity: (rows?.[0] ?? null) as EquityRow | null }));
                setBlockState('equity', true);
            });

        supabase
            .from('etf_holdings_snapshot')
            .select('etf_code')
            .eq('stock_code', stockCode)
            .order('data_date', { ascending: false })
            .limit(30)
            .then(async ({ data: holdRows }) => {
                const etfCodes = [...new Set((holdRows ?? []).map(h => h.etf_code))];
                if (!etfCodes.length) { setBlockState('aum', true); return; }
                const { data: aumRows, error } = await supabase
                    .from('etf_aum_series')
                    .select('etf_code, aum_100m, data_date')
                    .in('etf_code', etfCodes)
                    .order('data_date', { ascending: false })
                    .limit(etfCodes.length * 3);
                if (error) { setBlockState('aum', false); return; }
                const byEtf: Record<string, AumRow> = {};
                for (const r of aumRows ?? []) {
                    if (!byEtf[r.etf_code]) byEtf[r.etf_code] = { etf_code: r.etf_code, aum_100m: r.aum_100m };
                }
                setData(prev => ({ ...EMPTY_DATA, ...prev, aum: Object.values(byEtf) }));
                setBlockState('aum', true);
            });
    }, [stockCode, setBlockState]);

    return { data, loadingBlocks, errors };
}
