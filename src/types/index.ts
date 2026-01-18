export type CaseStatus = '辦理中' | '結案' | '解約' | 'Processing' | 'Closed' | 'Cancelled' | 'Pending' | '交屋';

export interface Case {
    id: string; // Using string for text-based ID or uuid
    case_number: string; // Primary Key according to README
    buyer_name: string; // Updated from buyer
    buyer_phone?: string;
    seller_name: string; // Updated from seller
    seller_phone?: string;
    city: string; // Updated from city_area
    tax_type?: '一般' | '自用';
    buyer_loan_bank?: string;
    seller_loan_bank?: string;
    escrow_account?: string;
    registrant_name?: string;
    registrant_phone?: string;
    agent_name?: string;
    agent_phone?: string;

    // Dates
    contract_date: string; // ISO date string
    seal_date?: string;
    tax_payment_date?: string;
    transfer_date?: string;
    balance_payment_date?: string;
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
    buyer_phone?: string;
    seller_name: string;
    seller_phone?: string;
    agent_name?: string;

    // 1.3 Property
    city: string;
    district: string;
    address?: string;
    property_type?: PropertyType;
    build_type?: BuildType;

    // 4. Flags & Notes (Excel specific)
    today_completion?: string; // 今日須完成
    other_notes?: string; // 其他備註

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

    has_keyed_overtime: boolean; // 加班費申報狀態
    todos?: Record<string, boolean>; // 固定代辦事項
    cancellation_type?: '代書塗銷' | '賣方自辦' | '無'; // 塗銷方式
    tax_type?: '一般' | '自用'; // 增值稅類型 (稅單性質)

    // Joined Tables
    milestones?: Milestone[];
    financials?: Financials[];
    todos_list?: TodoRecord[];
}

export interface TodoRecord {
    id: string;
    user_id: string;
    case_id?: string;
    content: string;
    is_completed: boolean;
    priority: string;
    due_date?: string;
    created_at: string;
    source_type?: string;
    source_key?: string;
    type?: string;
    is_deleted?: boolean;
}

export interface Milestone {
    id: string;
    case_id: string;
    contract_date?: string; // 簽約
    sign_diff_date?: string; // 簽差
    seal_date?: string; // 用印
    tax_payment_date?: string; // 完稅
    transfer_date?: string; // 過戶
    balance_payment_date?: string; // 尾款
    handover_date?: string; // 交屋
    fee_precollect_date?: string; // 預收規費 (Excel shows as date in some columns)

    // Custom note for Transfer Date (過戶日)
    transfer_note?: string;

    sign_diff_days?: number;
    redemption_date?: string;
    tax_filing_date?: string;

    // Appointments (Client Meetings)
    sign_appointment?: string;
    seal_appointment?: string;
    tax_appointment?: string;
    handover_appointment?: string;

    // Payment Details
    contract_method?: string;
    contract_amount?: number;
    sign_diff_amount?: number;
    seal_method?: string;
    seal_amount?: number;
    tax_method?: string;
    tax_amount?: number;
    balance_method?: string;
    balance_amount?: number;
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

    // Tax Deadlines
    land_value_tax_deadline?: string;
    deed_tax_deadline?: string;
    land_tax_deadline?: string;
    house_tax_deadline?: string;
}

export type TodoPriority =
    | 'urgent_important'
    | 'urgent_not_important'
    | 'not_urgent_important'
    | 'not_urgent_not_important';

export interface PersonalTodo {
    id: string;
    user_id: string;
    content: string;
    is_completed: boolean;
    priority: TodoPriority;
    due_date?: string;
    created_at: string;
}

export interface DateLog {
    id: string;
    case_id: string;
    field_name: string;
    old_value: string;
    new_value: string;
    changed_at: string;
    user_id?: string;
}

export interface DashboardStats {
    activeCount: number;
    completedCount: number;
    upcomingCount: number;
    newThisWeek: number;
    completionRate: number;
}

export interface Bank {
    id: string;
    created_at?: string;
    updated_at?: string;
    name: string;
    branch?: string;
    loan_conditions?: string; // Multi-line text for rules
    redemption_phone?: string;
    redemption_account?: string;
    redemption_days?: string;
    redemption_location?: string;
    redemption_note?: string;
    contacts?: any[]; // Keep flexible for JSONB
    user_id?: string;
}
