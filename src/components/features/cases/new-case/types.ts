/**
 * 新增案件表單的類型定義與初始值
 */

export interface CaseFormData {
    case_number: string;
    city: string;
    district: string;
    status: string;
    total_price: string;
    tax_type: string;
    buyer_loan_bank: string;
    seller_loan_bank: string;
    seller_redemption_amount: string; // 設定金額
    cancellation_type: string;
    escrow_account: string;
    buyer_name: string;
    buyer_phone: string;
    registrant_name: string;
    registrant_phone: string;
    seller_name: string;
    seller_phone: string;
    agent_name: string;
    agent_phone: string;
    contract_date: string;
    contract_amount: string;
    sign_diff_date: string;
    sign_diff_amount: string;
    seal_date: string;
    seal_amount: string;
    tax_payment_date: string;
    tax_amount: string;
    transfer_date: string;
    transfer_note: string;
    redemption_date: string;
    handover_date: string;
    balance_amount: string;
    balance_payment_date: string;
    notes: string;
    loan_estimates_json?: string;
}

export const initialFormData: CaseFormData = {
    case_number: '',
    city: '台北(士)',
    district: '',
    status: 'Processing',
    total_price: '',
    tax_type: '一般',
    buyer_loan_bank: '',
    seller_loan_bank: '',
    seller_redemption_amount: '',
    cancellation_type: '代書塗銷',
    escrow_account: '',
    buyer_name: '',
    buyer_phone: '',
    registrant_name: '',
    registrant_phone: '',
    seller_name: '',
    seller_phone: '',
    agent_name: '',
    agent_phone: '',
    contract_date: '',
    contract_amount: '',
    sign_diff_date: '',
    sign_diff_amount: '',
    seal_date: '',
    seal_amount: '',
    tax_payment_date: '',
    tax_amount: '',
    transfer_date: '',
    transfer_note: '',
    redemption_date: '',
    handover_date: '',
    balance_amount: '',
    balance_payment_date: '',
    notes: '',
};
