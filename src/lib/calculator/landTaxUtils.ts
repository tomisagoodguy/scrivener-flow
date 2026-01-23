import { money, round, roDate } from './baseUtils';
import { addDays } from 'date-fns';

export interface LandItem {
    id: string;
    lotNo: string;
    value: number;
    area: number;
    scope: number;
    landType: string;
}

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
            const t = Math.round(totalVal * 0.002);
            selfUseTax += t;
            details += `• 土地#${idx + 1} (自用): $${money(totalVal)} × 2‰ = $${money(t)}\n`;
        } else {
            generalValue += totalVal;
            details += `• 土地#${idx + 1} (一般): $${money(totalVal)} (併入累進計算)\n`;
        }
    });

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

export function calculateLandTaxProration(
    taxAmount: number,
    handoverDate: Date,
    regDate: Date,
    handoverToBuyer: boolean
) {
    const year = handoverDate.getFullYear();
    const jan1 = new Date(year, 0, 1);
    const taxRefDate = new Date(year, 7, 31);
    const dec31 = new Date(year, 11, 31);

    const taxpayerIsSeller = regDate > taxRefDate;
    const sellerEndDate = handoverToBuyer ? addDays(handoverDate, -1) : handoverDate;
    const daysInYear = (dec31.getTime() - jan1.getTime()) / 86400000 + 1;

    let sellerDays = (sellerEndDate.getTime() - jan1.getTime()) / 86400000 + 1;
    sellerDays = Math.max(0, Math.min(daysInYear, sellerDays));
    const buyerDays = daysInYear - sellerDays;

    let payAmount = 0;
    let buyerPaysSeller = 0;
    let sellerPaysBuyer = 0;

    if (taxpayerIsSeller) {
        payAmount = round(taxAmount * (buyerDays / daysInYear));
        buyerPaysSeller = payAmount;
    } else {
        payAmount = round(taxAmount * (sellerDays / daysInYear));
        sellerPaysBuyer = payAmount;
    }

    const rocYear = year - 1911;
    const isPaid = regDate <= taxRefDate;
    const paymentNature = isPaid ? "已到期數" : "未到期數";
    const taxpayerLabel = taxpayerIsSeller ? "賣方" : "買方";
    const payerLabel = taxpayerIsSeller ? "買方" : "賣方";
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

    return { buyerPaysSeller, sellerPaysBuyer, breakdown };
}
