export interface DiffLog {
    id: string;
    data_date: string;
    change_type: 'IN' | 'OUT' | 'BUY' | 'SELL';
    stock_code: string;
    stock_name: string;
    diff_shares: number;
    diff_weight: number;
    description: string;
    industry?: string;
    rank?: number | null;
}

export interface Holding {
    stock_id: string;
    stock_code: string;
    stock_name: string;
    shares: number;
    weight: number;
    price: number | null;
    change_percent: number | null;
    amount: number | null;
    currency: string | null;
    margin_ratio?: number;
    volatility?: number;
    market_cap?: number;
    is_high_5d?: boolean;
    is_high_20d?: boolean;
    is_high_200d?: boolean;
    monthly_revenue?: number;
    revenue_yoy?: number;
    revenue_mom?: number;
    revenue_momentum_rank?: number;
    revenue_month?: string | null;
    industry?: string;
    weightRank?: number;
}
