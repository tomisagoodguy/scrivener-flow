import { money, round, roDate } from './baseUtils';
import { addDays } from 'date-fns';

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

export function calculateHouseTaxProration(
    taxAmount: number,
    handoverDate: Date,
    regDate: Date,
    handoverToBuyer: boolean
) {
    const hYear = handoverDate.getFullYear();
    const hMonth = handoverDate.getMonth() + 1;

    let cycleStart: Date, cycleEnd: Date, refDate: Date;

    if (hMonth >= 7) {
        cycleStart = new Date(hYear, 6, 1);
        cycleEnd = new Date(hYear + 1, 5, 30);
        const febEndDay = new Date(hYear + 1, 2, 0).getDate();
        refDate = new Date(hYear + 1, 1, febEndDay);
    } else {
        cycleStart = new Date(hYear - 1, 6, 1);
        cycleEnd = new Date(hYear, 5, 30);
        const febEndDay = new Date(hYear, 2, 0).getDate();
        refDate = new Date(hYear, 1, febEndDay);
    }

    const daysInCycle = (cycleEnd.getTime() - cycleStart.getTime()) / 86400000 + 1;
    const taxpayerIsSeller = regDate > refDate;
    const sellerEndDate = handoverToBuyer ? addDays(handoverDate, -1) : handoverDate;

    let sellerDays = (sellerEndDate.getTime() - cycleStart.getTime()) / 86400000 + 1;
    sellerDays = Math.max(0, Math.min(daysInCycle, sellerDays));
    const buyerDays = daysInCycle - sellerDays;

    let payAmount = 0;
    let buyerPaysSeller = 0;
    let sellerPaysBuyer = 0;

    if (taxpayerIsSeller) {
        payAmount = round(taxAmount * (buyerDays / daysInCycle));
        buyerPaysSeller = payAmount;
    } else {
        payAmount = round(taxAmount * (sellerDays / daysInCycle));
        sellerPaysBuyer = payAmount;
    }

    const cycleYearROC = cycleEnd.getFullYear() - 1911;
    const cycleStartYearROC = cycleStart.getFullYear() - 1911;
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

    return { buyerPaysSeller, sellerPaysBuyer, breakdown };
}
