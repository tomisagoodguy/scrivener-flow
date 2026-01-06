export type CaseStatus = '辦理中' | '結案' | '解約';

export interface Case {
    id: string; // Using string for text-based ID or uuid, but README says case_number is PK. Let's use case_number as ID or logical ID.
    case_number: string; // Primary Key according to README
    buyer: string;
    seller: string;
    city_area: string;
    tax_type: '一般' | '自用';
    buyer_loan_bank?: string;
    seller_loan_bank?: string;

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

export interface DashboardStats {
    activeCount: number;
    completedCount: number;
    upcomingCount: number;
    newThisWeek: number;
    completionRate: number;
}
