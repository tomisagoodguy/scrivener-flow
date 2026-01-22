/**
 * 租約項目接口
 */
export interface LeaseItem {
    id: string;
    tenantName: string;
    monthlyRent: number;
    deposit: number;
    paidUntil: string;
}

/**
 * 稅費計算器屬性
 */
export interface TaxRentCalculatorProps {
    initialRegDate?: string;
    initialHandoverDate?: string;
}

/**
 * 計算結果接口
 */
export interface TaxCalculationResult {
    land: ProrationResult;
    house: ProrationResult;
    mgmt: ProrationResult;
    park: ProrationResult;
    util: ProrationResult;
    rent: ProrationResult;
    totals: {
        buyerPays: number;
        sellerPays: number;
        net: number;
    };
}

export interface ProrationResult {
    buyerPaysSeller: number;
    sellerPaysBuyer: number;
    breakdown: string;
}
