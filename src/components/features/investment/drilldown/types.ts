export interface PositionRow {
    stock_code: string;
    stock_name?: string;
    cost_basis: number;
    mv_now: number;
    pnl: number;
    pnl_pct: number;
    delta_days: number;
    first_entry_date: string;
    entry_price: number | null;
    curr_price: number | null;
    curr_shares: number;
    is_active: boolean;
    exit_date: string | null;
    realized_pnl_pct: number | null;
}

export interface DiffLogRow {
    etf_code: string;
    data_date: string;
    stock_code: string;
    stock_name?: string;
    change_type: string;
    diff_shares: number | null;
    curr_shares: number | null;
    prev_shares?: number | null;
    prev_weight: number | null;
    curr_weight: number | null;
    diff_weight?: number | null;
    is_significant?: boolean | null;
    amount_亿?: number | null;
}
