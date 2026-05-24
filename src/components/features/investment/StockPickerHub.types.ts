export interface HoldingItem {
    stock_code: string;
    stock_name: string;
    weight: number;
    rank: number;
    in_etfs: string[];
    revenue_yoy?: number | null;
    amount?: number | null;
    margin_ratio?: number | null;
    is_high_5d?: boolean | null;
    is_high_20d?: boolean | null;
    is_high_200d?: boolean | null;
    volatility?: number | null;
    industry?: string | null;
}

export interface EtfData {
    etf_code: string;
    name: string;
    color: string;
    holdings: HoldingItem[];
}

export interface QuantFilter {
    momentum_60d: number | null;
    momentum_pass: boolean;
    it_buy_5d: number | null;
    it_buy_5d_pass: boolean;
    rev_ma3: number | null;
    rev_ma3_new_high: boolean;
    filter_score: number;
}

export interface StockPickerHubProps {
    etfs: EtfData[];
    quantFilters: Record<string, QuantFilter>;
    signals?: Record<string, { strength: 1 | 2 | 3; type: string }>;
    fundConsensusMap?: Record<string, { consensus_count: number; fund_consec_days: number }>;
}

export type SortField = 'shared_count' | 'filter_score' | 'momentum_60d' | 'it_buy_5d' | 'consensus_count' | 'fund_consec_days' | string;

export type SortOrder = 'asc' | 'desc';

export type FactorFilter =
    | 'new_high' | 'high_20d' | 'high_200d'
    | 'weight_top10' | 'amount_top10' | 'yoy_20' | 'low_vol' | 'margin_high10' | 'margin_low10'
    | 'momentum' | 'it_buy' | 'rev_new_high' | 'all_shared' | 'golden_zone' | 'explosive_zone'
    | 'triple_consensus';

export interface UnifiedHolding {
    stock_code: string;
    stock_name: string;
    shared_count: number;
    weights: Record<string, number>;
    maxWeight: number;
    filter_score: number;
    momentum_60d: number | null;
    it_buy_5d: number | null;
    momentum_pass: boolean;
    it_buy_5d_pass: boolean;
    rev_ma3_new_high: boolean;
    revenue_yoy: number | null;
    amount: number | null;
    margin_ratio: number | null;
    is_high_5d: boolean;
    is_high_20d: boolean;
    is_high_200d: boolean;
    volatility: number | null;
    industry: string | null;
    consensus_count?: number;
    fund_consec_days?: number;
    weightRank?: number;
    amountRank?: number;
    marginRankHigh?: number;
    marginRankLow?: number;
}

export const HOLDING_SORT_FIELDS = new Set([
    'filter_score', 'momentum_60d', 'it_buy_5d', 'revenue_yoy', 'amount', 'margin_ratio', 'volatility',
    'consensus_count', 'fund_consec_days',
]);
