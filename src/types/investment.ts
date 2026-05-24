export type ChangeType = 'IN' | 'BUY' | 'SELL' | 'OUT' | 'CLOSE';

export const CHANGE_TYPE_LABELS: Record<ChangeType, string> = {
    IN:    '首次建倉',
    BUY:   '加碼',
    SELL:  '減碼',
    OUT:   '出清',
    CLOSE: '大幅縮減',
};

export interface DiffEvent {
    date: string;
    changeType: ChangeType;
    diffShares: number;
    estimatedAmount: number;
}

export interface StockPnlResult {
    etfCode: string;
    etfName: string;
    stockCode: string;
    pnl: number;
    pnlPct: number;
    mvNow: number;
    costBasis: number;
    minDate: string;
    curve: { date: string; value: number }[];
    sharesHistory: { date: string; shares: number }[];
    priceHistory: { date: string; open: number; high: number; low: number; close: number }[];
    events: DiffEvent[];
    status: 'ok' | 'no_price' | 'no_shares';
    // Reference-style fields from etf_position_summary
    entryPrice?: number;   // 加權平均進場價
    currPrice?: number;    // 當前收盤價
    deltaDays?: number;    // 持倉天數
    currShares?: number;   // 當前持有股數（股）
    isActive?: boolean;    // 是否仍持倉
}

export interface DiffLog {
    id: string;
    etf_code?: string;
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
    it_buy_5d?: number | null;          // 投信 5日累積買超 (張)
    it_buy_5d_pass?: boolean;           // filter: it_buy_5d > 0
    rev_ma3?: number | null;            // 最新 3月均營收 (千元)
    rev_ma3_new_high?: boolean;         // filter: rev_ma3 == rolling(12).max()
    filter_score?: number;              // 通過 Filter 數 (0~3)
    is_disposal: boolean;               // 分時交易（處置）狀態，由 DisposalDetectStep 每日更新
}
