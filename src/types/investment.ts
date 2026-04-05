export interface DiffLog {
    id: string;
    data_date: string;
    change_type: 'IN' | 'OUT' | 'BUY' | 'SELL' | 'CLOSE';
    stock_code: string;
    stock_name: string;
    diff_shares: number;
    diff_weight: number;
    description: string;
    industry?: string;
    rank?: number | null;
    prev_weight?: number | null;
    curr_weight?: number | null;
    prev_shares?: number | null;
    curr_shares?: number | null;
    is_significant?: boolean | null;
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
    amountRank?: number;
    marginRankHigh?: number;
    marginRankLow?: number;
    // === 三大量化 Filter ===
    momentum_60d?: number | null;       // close/close[60]-1 百分比
    momentum_pass?: boolean;            // filter: momentum > 0
    it_buy_10d?: number | null;         // 投信 10日累積買超 (張)
    it_buy_10d_pass?: boolean;          // filter: it_buy_10d > 0
    rev_ma3?: number | null;            // 最新 3月均營收 (千元)
    rev_ma3_new_high?: boolean;         // filter: rev_ma3 == rolling(12).max()
    filter_score?: number;              // 通過 Filter 數 (0~3)
}
