
export interface ParsedCaseData {
    case_number?: string;
    buyer_name?: string;
    buyer_phone?: string;
    seller_name?: string;
    seller_phone?: string;
    registrant_name?: string;
    registrant_phone?: string;
    agent_name?: string;
    agent_phone?: string;
    escrow_account?: string;
    seller_loan_bank?: string;
    seller_redemption_amount?: number; // 新增設定金額欄位
    total_price?: number;

    contract_date?: string;
    contract_amount?: number;
    contract_method?: string;

    sign_diff_date?: string;
    sign_diff_amount?: number;

    seal_date?: string;
    seal_amount?: number;
    seal_method?: string;

    tax_payment_date?: string;
    tax_amount?: number;
    tax_method?: string;

    balance_payment_date?: string;
    balance_amount?: number;
    balance_method?: string;

    transfer_date?: string;
    handover_date?: string;

    debug_text?: string;
}
