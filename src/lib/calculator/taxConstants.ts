/**
 * 稅費計算常數
 * 資料來源：內政部地政司、財政部（2025 年版）
 */

/** 印花稅率（買賣契約） */
export const DEED_STAMP_TAX_RATE = 0.001;

/** 地價稅基本稅率（自用住宅） */
export const LAND_TAX_OWNER_RATE = 0.002;

/** 地價稅累進稅率層距 */
export const LAND_TAX_PROGRESSIVE_RATES = [
    { multiplier: 1,   rate: 0.010, deduction: 0 },
    { multiplier: 5,   rate: 0.015, deduction: 0.005 },
    { multiplier: 10,  rate: 0.025, deduction: 0.065 },
    { multiplier: 15,  rate: 0.035, deduction: 0.175 },
    { multiplier: 20,  rate: 0.045, deduction: 0.335 },
    { multiplier: Infinity, rate: 0.055, deduction: 0.545 },
] as const;

// 房屋稅稅率情境定義於 src/lib/calculator/houseTaxUtils.ts（HOUSE_TAX_SCENARIOS）
