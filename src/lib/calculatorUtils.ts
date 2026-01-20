import { addDays } from 'date-fns';

/**
 * 稅費分算計算工具模組 v5.3
 * Tax & Rent Proration Calculator Utilities
 * 
 * 本模組提供不動產交易稅費分算的核心計算邏輯，包括：
 * - 地價稅年度計算與分算（多筆累進、8/31基準日）
 * - 房屋稅年度計算與分算（2/28基準日、7/1-6/30課稅期間）
 * - 管理費/車位費分算（跨月分段計算）
 * - 租金分算（與管理費邏輯相反）
 * 
 * 邏輯移植自 Python 版本「整合版不動產交屋稅費計算系統 v5.0」
 * 
 * @author Antigravity AI
 * @version 5.3
 * @date 2026-01-20
 */

// --- Types ---

export interface LandItem {
    id: string;
    lotNo: string; // 地號/說明
    value: number; // 申報地價
    area: number;  // 面積 m2
    scope: number; // 權利範圍 (e.g. 1/1 = 1, 1/2 = 0.5)
    landType: string; // "自用住宅 (2‰)" or "一般用地 (10‰)"
}

export interface HouseTaxParams {
    presentValue: number; // 房屋現值
    taxRate: number;      // 稅率
}

export interface CalculationResult {
    buyerPaysSeller: number;
    sellerPaysBuyer: number;
    breakdown: string;
}

// 稅率表數據 (Matching Python Script)
export const HOUSE_TAX_SCENARIOS = [
    { label: "自住用-全國單一自住(現值一定金額下)", rate: 0.010 },
    { label: "自住用-全國3戶內", rate: 0.012 },
    { label: "公益出租人/社會住宅", rate: 0.012 },
    { label: "非自住-出租(達租金標準)/繼承共有-4戶內", rate: 0.015 },
    { label: "非自住-出租(達租金標準)/繼承共有-5~6戶", rate: 0.020 },
    { label: "非自住-出租(達租金標準)/繼承共有-7戶以上", rate: 0.024 },
    { label: "非自住-其他住家用-2戶內", rate: 0.032 },
    { label: "非自住-其他住家用-3~4戶", rate: 0.038 },
    { label: "非自住-其他住家用-5~6戶", rate: 0.042 },
    { label: "非自住-其他住家用-7戶以上", rate: 0.048 },
    { label: "營業用", rate: 0.030 },
    { label: "私人醫院/診所/事務所用", rate: 0.030 },
    { label: "非住家非營業用(人民團體等)", rate: 0.020 }
];

export type DateLike = string | Date;

// --- Helper Functions ---

// 1. Money Formatter
export const money = (val: number) => Math.round(val).toLocaleString();

// 2. Rounding
const round = (num: number) => Math.round(num);

// 3. ROC Date Parser/Formatter
export const parseDateString = (d: DateLike): Date => {
    if (d instanceof Date) return d;
    if (!d) return new Date();

    // Normalize string
    let s = d.replace(/\//g, '-').trim();

    // Check if ROC (6 or 7 digits) e.g. 1141008
    const isROC = /^\d{6,7}$/.test(s);
    if (isROC) {
        const yearLen = s.length === 7 ? 3 : 2;
        const rocYear = parseInt(s.substring(0, yearLen));
        const month = parseInt(s.substring(yearLen, yearLen + 2)) - 1; // 0-indexed
        const day = parseInt(s.substring(yearLen + 2));
        return new Date(rocYear + 1911, month, day);
    }

    return new Date(s);
};

export const roDate = (d: DateLike): string => {
    try {
        const date = parseDateString(d);
        if (isNaN(date.getTime())) return '';
        const rocYear = date.getFullYear() - 1911;
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `民國 ${rocYear} 年 ${month} 月 ${day} 日`;
    } catch (e) {
        return '';
    }
};

// --- New Logic: Land Tax Calculation ---

export function calculateAnnualLandTax(
    lands: LandItem[],
    progressiveStartValue: number = 1700000
): { totalTax: number, detail: string } {
    let selfUseTax = 0;
    let generalValue = 0;
    let details = '';

    lands.forEach((l, idx) => {
        const totalVal = Math.round(l.value * l.area * l.scope);
        if (l.landType.includes("2‰")) {
            // Self Use: Flat 0.002
            const t = Math.round(totalVal * 0.002);
            selfUseTax += t;
            details += `• 土地#${idx + 1} (自用): $${money(totalVal)} × 2‰ = $${money(t)}\n`;
        } else {
            generalValue += totalVal;
            details += `• 土地#${idx + 1} (一般): $${money(totalVal)} (併入累進計算)\n`;
        }
    });

    // Progressive Calculation for General Land
    let generalTax = 0;
    const v = generalValue;
    const p = progressiveStartValue;

    if (v > 0) {
        if (v <= p) generalTax = v * 0.010;
        else if (v <= p * 5) generalTax = v * 0.015 - p * 0.005;
        else if (v <= p * 10) generalTax = v * 0.025 - p * 0.065;
        else if (v <= p * 15) generalTax = v * 0.035 - p * 0.175;
        else if (v <= p * 20) generalTax = v * 0.045 - p * 0.335;
        else generalTax = v * 0.055 - p * 0.545;

        details += `• 一般用地總值: $${money(v)} (累進起點 $${money(p)})\n`;
        details += `  -> 累進稅額: $${money(Math.round(generalTax))}\n`;
    }

    const total = Math.round(selfUseTax + generalTax);
    return {
        totalTax: total,
        detail: details.trim() || '無土地資料'
    };
}


// --- 4. Land Tax Proration (Aug 31 Baseline) ---
export function calculateLandTaxProration(
    taxAmount: number,
    handoverDate: Date,
    regDate: Date, // Transfer Date
    handoverToBuyer: boolean
): CalculationResult {
    const year = handoverDate.getFullYear();
    const taxYearStart = new Date(year, 0, 1); // Jan 1
    const taxRefDate = new Date(year, 7, 31); // Aug 31
    const taxYearEnd = new Date(year, 11, 31); // Dec 31

    // Determine Taxpayer (Who owned it on Aug 31?)
    const taxpayerIsSeller = regDate > taxRefDate;

    // Determine Cut-off based on Handover Day Ownership
    const sellerEndDate = handoverToBuyer ? addDays(handoverDate, -1) : handoverDate;

    const jan1 = new Date(year, 0, 1);
    const dec31 = new Date(year, 11, 31);
    const daysInYear = (dec31.getTime() - jan1.getTime()) / 86400000 + 1;

    // Seller Days (Jan 1 to SellerEndDate)
    let sellerDays = (sellerEndDate.getTime() - jan1.getTime()) / 86400000 + 1;
    sellerDays = Math.max(0, Math.min(daysInYear, sellerDays));

    // Buyer Days (Total - SellerDays)
    const buyerDays = daysInYear - sellerDays;

    let payAmount = 0;
    let buyerPaysSeller = 0;
    let sellerPaysBuyer = 0;

    // ROC Year formatting
    const rocYear = year - 1911;

    if (taxpayerIsSeller) {
        payAmount = round(taxAmount * (buyerDays / daysInYear));
        buyerPaysSeller = payAmount;
    } else {
        payAmount = round(taxAmount * (sellerDays / daysInYear));
        sellerPaysBuyer = payAmount;
    }

    // 判斷款項性質: 8/31前過戶 = 已到期數, 8/31後過戶 = 未到期數
    const isPaid = regDate <= taxRefDate;
    const paymentNature = isPaid ? "已到期數" : "未到期數";

    // 詳細說明 (仿照 Python 版本)
    const taxpayerLabel = taxpayerIsSeller ? "賣方" : "買方";
    const payerLabel = taxpayerIsSeller ? "買方" : "賣方";
    const payer = taxpayerIsSeller ? "買方" : "賣方";
    const payee = taxpayerIsSeller ? "賣方" : "買方";
    const findDays = taxpayerIsSeller ? buyerDays : sellerDays;

    const breakdown = `納稅人為【${taxpayerLabel}】，由【${payerLabel}】補貼${payee}。

【找補計算】
  $${money(taxAmount)} × (${findDays} / ${daysInYear}) = $${money(payAmount)}

【款項性質】
  此為民國 ${rocYear} 年度地價稅找補，屬【${paymentNature}】款項。

---
【稅務規則】
● 課稅年度: 民國 ${rocYear} 年 (1/1 ~ 12/31)
● 開徵期間: 民國 ${rocYear} 年 11 月 1 日 至 11 月 30 日
● 納稅基準日: 民國 ${rocYear} 年 8 月 31 日
● 本案納稅人: 【${taxpayerLabel}】 (以基準日之地政登記所有權人為準)`;

    return {
        buyerPaysSeller,
        sellerPaysBuyer,
        breakdown
    };
}

// --- 5. House Tax Proration (July 1 - June 30 Cycle) ---
export function calculateHouseTaxProration(
    taxAmount: number,
    handoverDate: Date,
    regDate: Date, // Transfer Date
    handoverToBuyer: boolean
): CalculationResult {
    const hYear = handoverDate.getFullYear();
    const hMonth = handoverDate.getMonth() + 1; // 1-12

    let cycleStart: Date, cycleEnd: Date;
    let refDate: Date; // The Feb 28/29 date that determines taxpayer

    if (hMonth >= 7) {
        cycleStart = new Date(hYear, 6, 1); // July 1
        cycleEnd = new Date(hYear + 1, 5, 30); // June 30 next year
        const febEndDay = new Date(hYear + 1, 2, 0).getDate();
        refDate = new Date(hYear + 1, 1, febEndDay);
    } else {
        cycleStart = new Date(hYear - 1, 6, 1); // Prev July 1
        cycleEnd = new Date(hYear, 5, 30); // June 30
        const febEndDay = new Date(hYear, 2, 0).getDate();
        refDate = new Date(hYear, 1, febEndDay);
    }

    const daysInCycle = (cycleEnd.getTime() - cycleStart.getTime()) / 86400000 + 1;

    // Determine Taxpayer
    const taxpayerIsSeller = regDate > refDate;

    // Calculate Periods
    const sellerEndDate = handoverToBuyer ? addDays(handoverDate, -1) : handoverDate;

    let sellerDays = (sellerEndDate.getTime() - cycleStart.getTime()) / 86400000 + 1;
    sellerDays = Math.max(0, Math.min(daysInCycle, sellerDays));

    const buyerDays = daysInCycle - sellerDays;

    let payAmount = 0;
    let buyerPaysSeller = 0;
    let sellerPaysBuyer = 0;

    // ROC Year
    const cycleYearROC = cycleEnd.getFullYear() - 1911;
    const cycleStartYearROC = cycleStart.getFullYear() - 1911;

    if (taxpayerIsSeller) {
        payAmount = round(taxAmount * (buyerDays / daysInCycle));
        buyerPaysSeller = payAmount;
    } else {
        payAmount = round(taxAmount * (sellerDays / daysInCycle));
        sellerPaysBuyer = payAmount;
    }

    // 判斷款項性質
    const isPaid = regDate <= refDate;
    const paymentNature = isPaid ? "已到期數" : "未到期數";

    const taxpayerLabel = taxpayerIsSeller ? "賣方" : "買方";
    const payerLabel = taxpayerIsSeller ? "買方" : "賣方";
    const payee = taxpayerIsSeller ? "賣方" : "買方";
    const findDays = taxpayerIsSeller ? buyerDays : sellerDays;

    const breakdown = `納稅人為【${taxpayerLabel}】，由【${payerLabel}】補貼${payee}。

【找補計算】
  $${money(taxAmount)} × (${findDays} / ${daysInCycle}) = $${money(payAmount)}

【款項性質】
  此為民國 ${cycleYearROC} 年度房屋稅找補，屬【${paymentNature}】款項。

---
【稅務規則】
● 課稅期間: 民國 ${cycleStartYearROC}/7/1 至 ${cycleYearROC}/6/30
● 開徵期間: 民國 ${cycleYearROC} 年 5 月 1 日 至 5 月 31 日
● 納稅基準日: ${roDate(refDate)}
● 本案納稅人: 【${taxpayerLabel}】 (以基準日之房屋所有權人為準)`;

    return {
        buyerPaysSeller,
        sellerPaysBuyer,
        breakdown
    };
}

// --- 6. Monthly Fee Proration (Mgmt, Parking) ---
export function calculateFeeProration(
    amount: number, // Monthly fee
    paidUntil: Date,
    handoverDate: Date,
    handoverToBuyer: boolean
): CalculationResult {
    const cutoffDate = handoverToBuyer ? handoverDate : addDays(handoverDate, 1);

    let buyerPaysSeller = 0;
    let sellerPaysBuyer = 0;
    let desc = "";

    let pUntil = new Date(paidUntil); pUntil.setHours(0, 0, 0, 0);
    // If paidUntil is NaN (invalid), return
    if (isNaN(pUntil.getTime())) return { buyerPaysSeller: 0, sellerPaysBuyer: 0, breakdown: '日期錯誤' };

    let cDate = new Date(cutoffDate); cDate.setHours(0, 0, 0, 0);

    if (pUntil >= cDate) {
        // Case A: Prepaid.
        // Period: Cutoff ~ PaidUntil
        buyerPaysSeller = calculateProratedRent(amount, cDate, pUntil);

        // 詳細跨月分段描述
        const detailDesc = getDetailedFeeDescription(amount, cDate, pUntil, true);
        desc = `【買方補貼預繳】\n期間: ${roDate(cDate)} ~ ${roDate(pUntil)}\n${detailDesc}`;
    } else {
        // Case B: Arrears.
        // Period: PaidUntil+1 ~ Cutoff-1
        const startArrears = addDays(pUntil, 1);
        const endArrears = addDays(cDate, -1);

        if (startArrears <= endArrears) {
            sellerPaysBuyer = calculateProratedRent(amount, startArrears, endArrears);

            // 詳細跨月分段描述
            const detailDesc = getDetailedFeeDescription(amount, startArrears, endArrears, false);
            desc = `【賣方補足欠費】\n期間: ${roDate(startArrears)} ~ ${roDate(endArrears)}\n${detailDesc}`;
        } else {
            desc = "無需找補 (已結清)";
        }
    }

    return {
        buyerPaysSeller,
        sellerPaysBuyer,
        breakdown: desc
    };
}

// Helper: Generate detailed monthly breakdown description
function getDetailedFeeDescription(monthly: number, start: Date, end: Date, isPrepaid: boolean): string {
    const sameMonth = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();

    if (sameMonth) {
        // 同月內計算
        const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
        const days = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
        return `$${money(monthly)} × (${days}/${daysInMonth}) = $${money(Math.round(monthly * days / daysInMonth))}`;
    } else {
        // 跨月計算 - 顯示第一個月和最後一個月的計算
        const startMonthDays = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
        const endMonthDays = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();

        const daysMonth1 = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate() - start.getDate() + 1;
        const daysMonthLast = end.getDate();

        const monthsBetween = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();

        let desc = `$${money(monthly)} × (${daysMonth1}/${startMonthDays})`;
        if (monthsBetween > 1) {
            desc += ` + $${money(monthly)} × ${monthsBetween - 1} (整月)`;
        }
        desc += ` + $${money(monthly)} × (${daysMonthLast}/${endMonthDays})`;

        return desc;
    }
}

// Internal Helper
function calculateProratedRent(monthlyRate: number, startDate: Date, endDate: Date): number {
    let total = 0;
    let curr = new Date(startDate);
    const end = new Date(endDate);

    // Safety
    if (curr > end) return 0;

    while (curr <= end) {
        const y = curr.getFullYear();
        const m = curr.getMonth();
        const lastDayOfMonth = new Date(y, m + 1, 0);

        let segEnd = end < lastDayOfMonth ? end : lastDayOfMonth;

        const daysInMonth = lastDayOfMonth.getDate();
        const daysInSeg = (segEnd.getTime() - curr.getTime()) / 86400000 + 1;

        total += (monthlyRate * daysInSeg) / daysInMonth;

        curr = addDays(lastDayOfMonth, 1);
    }
    return round(total);
}

// --- 7. Rent Proration (租金分算 - 邏輯與管理費相反) ---
// 租金邏輯: 預收 → 賣方補買方, 欠收 → 買方補賣方
export function calculateRentProration(
    monthlyRent: number,
    paidUntil: Date,
    handoverDate: Date,
    handoverToBuyer: boolean
): CalculationResult {
    const cutoffDate = handoverToBuyer ? handoverDate : addDays(handoverDate, 1);

    let buyerPaysSeller = 0;
    let sellerPaysBuyer = 0;
    let desc = "";

    let pUntil = new Date(paidUntil); pUntil.setHours(0, 0, 0, 0);
    if (isNaN(pUntil.getTime())) return { buyerPaysSeller: 0, sellerPaysBuyer: 0, breakdown: '日期錯誤' };

    let cDate = new Date(cutoffDate); cDate.setHours(0, 0, 0, 0);

    if (pUntil >= cDate) {
        // Case A: 租客已繳至日期 >= 交屋日 (預收租金)
        // → 賣方補貼買方 (因為賣方預收了買方期間的租金，要退給買方)
        //Period: Cutoff ~ PaidUntil
        sellerPaysBuyer = calculateProratedRent(monthlyRent, cDate, pUntil);

        const detailDesc = getDetailedFeeDescription(monthlyRent, cDate, pUntil, true);
        desc = `【賣方補貼買方 - 預收租金】\n期間: ${roDate(cDate)} ~ ${roDate(pUntil)}\n${detailDesc}\n(賣方預收了買方持有期間的租金，應退還買方)`;
    } else {
        // Case B: 租客已繳至日期 < 交屋日 (欠繳租金)
        // → 買方補貼賣方 (因為租客欠繳賣方期間的租金)
        // Period: PaidUntil+1 ~ (交屋日 - adjustment)
        const startArrears = addDays(pUntil, 1);
        const endArrears = addDays(cDate, -1);

        if (startArrears <= endArrears) {
            buyerPaysSeller = calculateProratedRent(monthlyRent, startArrears, endArrears);

            const detailDesc = getDetailedFeeDescription(monthlyRent, startArrears, endArrears, false);
            desc = `【買方補貼賣方 - 欠繳租金】\n期間: ${roDate(startArrears)} ~ ${roDate(endArrears)}\n${detailDesc}\n(租客欠繳賣方持有期間的租金，由買方代墊)`;
        } else {
            desc = "無需找補 (已結清)";
        }
    }

    return {
        buyerPaysSeller,
        sellerPaysBuyer,
        breakdown: desc
    };
}
