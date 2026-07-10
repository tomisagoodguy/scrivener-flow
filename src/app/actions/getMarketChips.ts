'use server';

import { createClient } from '@/lib/supabase/server';

export type FuturesInstitution = 'dealer' | 'trust' | 'foreign';
export type RetailContract = 'MXF' | 'TMF';
export type SignalType = 'dual_buy' | 'consecutive_buy' | 'divergence';

export interface FuturesPositionPoint {
    data_date: string;
    institution: FuturesInstitution;
    net_oi: number;
}

export interface RetailRatioPoint {
    data_date: string;
    contract: RetailContract;
    retail_ls_ratio: number;
}

export interface MarginBalancePoint {
    data_date: string;
    margin_balance: number;
    margin_change: number;
    short_balance: number;
    short_change: number;
}

export interface SignalMetadata {
    foreign_net: number;
    trust_net: number;
    etf_codes: string[];
    consecutive_days?: number;
    combined_series?: number[];
}

export interface InstitutionalSignal {
    data_date: string;
    signal_type: SignalType;
    stock_code: string;
    metadata: SignalMetadata;
    etf_cross: boolean;
}

export interface MarketChipsData {
    futuresPositions: FuturesPositionPoint[];
    retailRatios: RetailRatioPoint[];
    marginBalances: MarginBalancePoint[];
    signals: InstitutionalSignal[];
}

const FUTURES_INSTITUTIONS = ['dealer', 'trust', 'foreign'] as const;
const RETAIL_CONTRACTS = ['MXF', 'TMF'] as const;

function isFuturesInstitution(value: unknown): value is FuturesInstitution {
    return typeof value === 'string' && (FUTURES_INSTITUTIONS as readonly string[]).includes(value);
}

function isRetailContract(value: unknown): value is RetailContract {
    return typeof value === 'string' && (RETAIL_CONTRACTS as readonly string[]).includes(value);
}

function isSignalMetadata(value: unknown): value is SignalMetadata {
    if (typeof value !== 'object' || value === null) return false;
    const v = value as Record<string, unknown>;
    return typeof v.foreign_net === 'number' && typeof v.trust_net === 'number' && Array.isArray(v.etf_codes);
}

async function fetchFuturesPositions(supabase: Awaited<ReturnType<typeof createClient>>): Promise<FuturesPositionPoint[]> {
    const { data, error } = await supabase
        .from('futures_institutional_daily')
        .select('data_date, institution, net_oi')
        .eq('contract', 'TX')
        .in('institution', FUTURES_INSTITUTIONS)
        .order('data_date', { ascending: false })
        .limit(180);

    if (error || !data) return [];

    return data
        .filter((row) => isFuturesInstitution(row.institution))
        .map((row) => ({
            data_date: row.data_date as string,
            institution: row.institution as FuturesInstitution,
            net_oi: Number(row.net_oi),
        }))
        .reverse();
}

async function fetchRetailRatios(supabase: Awaited<ReturnType<typeof createClient>>): Promise<RetailRatioPoint[]> {
    const { data, error } = await supabase
        .from('futures_institutional_daily')
        .select('data_date, contract, retail_ls_ratio')
        .in('contract', RETAIL_CONTRACTS)
        .eq('institution', 'retail_summary')
        .order('data_date', { ascending: false })
        .limit(120);

    if (error || !data) return [];

    return data
        .filter((row) => isRetailContract(row.contract) && row.retail_ls_ratio !== null)
        .map((row) => ({
            data_date: row.data_date as string,
            contract: row.contract as RetailContract,
            retail_ls_ratio: Number(row.retail_ls_ratio),
        }))
        .reverse();
}

async function fetchMarginBalances(supabase: Awaited<ReturnType<typeof createClient>>): Promise<MarginBalancePoint[]> {
    const { data, error } = await supabase
        .from('market_margin_daily')
        .select('data_date, margin_balance, margin_change, short_balance, short_change')
        .order('data_date', { ascending: false })
        .limit(60);

    if (error || !data) return [];

    return data
        .map((row) => ({
            data_date: row.data_date as string,
            margin_balance: Number(row.margin_balance),
            margin_change: Number(row.margin_change),
            short_balance: Number(row.short_balance),
            short_change: Number(row.short_change),
        }))
        .reverse();
}

async function fetchLatestSignals(supabase: Awaited<ReturnType<typeof createClient>>): Promise<InstitutionalSignal[]> {
    const { data: latest, error: latestError } = await supabase
        .from('institutional_signals')
        .select('data_date')
        .order('data_date', { ascending: false })
        .limit(1);

    if (latestError || !latest || latest.length === 0) return [];
    const queryDate: string = latest[0].data_date;

    const { data, error } = await supabase
        .from('institutional_signals')
        .select('data_date, signal_type, stock_code, metadata, etf_cross')
        .eq('data_date', queryDate);

    if (error || !data) return [];

    return data
        .filter((row) => isSignalMetadata(row.metadata))
        .map((row) => ({
            data_date: row.data_date as string,
            signal_type: row.signal_type as SignalType,
            stock_code: row.stock_code as string,
            metadata: row.metadata as SignalMetadata,
            etf_cross: Boolean(row.etf_cross),
        }));
}

export async function getMarketChips(): Promise<MarketChipsData> {
    const supabase = await createClient();

    const [futuresPositions, retailRatios, marginBalances, signals] = await Promise.all([
        fetchFuturesPositions(supabase),
        fetchRetailRatios(supabase),
        fetchMarginBalances(supabase),
        fetchLatestSignals(supabase),
    ]);

    return { futuresPositions, retailRatios, marginBalances, signals };
}
