/**
 * 稅費分算計算工具模組 v6.0
 * 已重構為模組化結構，提升可維護性。
 */

export * from './calculator/baseUtils';
export * from './calculator/landTaxUtils';
export * from './calculator/houseTaxUtils';
export * from './calculator/feeUtils';

// Types (Keep here for backward compat or export from base)
export interface CalculationResult {
    buyerPaysSeller: number;
    sellerPaysBuyer: number;
    breakdown: string;
}
