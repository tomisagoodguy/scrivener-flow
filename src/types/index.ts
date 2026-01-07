export type CaseStatus = '辦理中' | '結案' | '解約' | 'Processing' | 'Closed' | 'Cancelled' | 'Pending' | '交屋';

export interface Case {
    id: string; // Using string for text-based ID or uuid
    case_number: string; // Primary Key according to README
    buyer: string; // Legacy
    seller: string; // Legacy
    city_area: string; // Legacy
    tax_type?: '一般' | '自用';
    buyer_loan_bank?: string; // Legacy
    seller_loan_bank?: string; // Legacy

    // Dates
    contract_date: string; // ISO date string
    seal_date?: string;
    tax_payment_date?: string;
    transfer_date?: string;
    handover_date?: string;

    status: CaseStatus;

    pending_tasks?: string;
    notes?: string;

    is_back_rent: boolean;
    back_rent_until?: string;

    created_at: string;
    updated_at: string;
}

// --- New Types for Schema v1.0 Demo ---

export type PropertyType = 'Apartment' | 'Building' | 'Land' | 'Parking';
export type BuildType = 'New_System' | 'Old_System' | 'Old_System_No_Household';
export type VatType = 'General' | 'Self_Use' | 'Inheritance' | '一般' | '自用' | '繼承';

export interface BankContact {
    id: string;
    bank_name: string;
    branch_name?: string;
    contact_person?: string;
    phone?: string;
    email?: string;
    note?: string;
    created_at: string;
}

export interface DemoCase {
    id: string;
    created_at: string;
    updated_at: string;

    // 1.1 Identity
    case_number: string;
    legacy_id?: string;
    status: CaseStatus;
    handler?: string;

    // 1.2 People
    buyer_name: string;
    seller_name: string;
    agent_name?: string;

    // 1.3 Property
    city: string;
    district: string;
    address?: string;
    property_type?: PropertyType;
    build_type?: BuildType;

    // 4. Flags & Notes (Excel specific)
    today_completion?: string; // 今日須完成
    other_notes?: string;      // 其他備註

    is_back_rent: boolean;
    has_tenant: boolean;
    is_radiation_check: boolean;
    is_sea_sand_check: boolean;

    check_priority_purchase: boolean;
    check_second_mortgage: boolean;
    check_seal_certificate: boolean;

    notes?: string; // 備註 (Excel: 備註)
    pending_tasks?: string;
    bank_contact_notes?: string;

    // Joined Tables
    milestones?: Milestone;
    financials?: Financials;
}

export interface Milestone {
    id: string;
    case_id: string;
    contract_date?: string;  // 簽約
    sign_diff_date?: string; // 簽差
    seal_date?: string;      // 用印
    tax_payment_date?: string; // 完稅
    transfer_date?: string;    // 過戶
    handover_date?: string;    // 交屋
    fee_precollect_date?: string; // 預收規費 (Excel shows as date in some columns)

    sign_diff_days?: number;
    redemption_date?: string;
    tax_filing_date?: string;
}

export interface Financials {
    id: string;
    case_id: string;
    total_price?: number;
    pre_collected_fee?: number;
    balance_payment?: number;
    vat_type?: VatType; // 類型
    tax_house_land: boolean;
    tax_repurchase: boolean;

    buyer_bank?: string; // B貸款
    buyer_loan_amount?: number;
    seller_bank?: string; // S貸款
    seller_redemption_amount?: number;
}

export interface DashboardStats {
    activeCount: number;
    completedCount: number;
    upcomingCount: number;
    newThisWeek: number;
    completionRate: number;
}
