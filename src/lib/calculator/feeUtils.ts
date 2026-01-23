import { money, round, roDate } from './baseUtils';
import { addDays } from 'date-fns';

export function calculateProratedRent(monthlyRate: number, startDate: Date, endDate: Date): number {
    let total = 0;
    let curr = new Date(startDate);
    const end = new Date(endDate);
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

export function getDetailedFeeDescription(monthly: number, start: Date, end: Date, isPrepaid: boolean): string {
    const sameMonth = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();
    if (sameMonth) {
        const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
        const days = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
        return `$${money(monthly)} × (${days}/${daysInMonth}) = $${money(Math.round(monthly * days / daysInMonth))}`;
    } else {
        const startMonthDays = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
        const endMonthDays = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();
        const daysMonth1 = startMonthDays - start.getDate() + 1;
        const daysMonthLast = end.getDate();
        const monthsBetween = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
        let desc = `$${money(monthly)} × (${daysMonth1}/${startMonthDays})`;
        if (monthsBetween > 1) desc += ` + $${money(monthly)} × ${monthsBetween - 1} (整月)`;
        desc += ` + $${money(monthly)} × (${daysMonthLast}/${endMonthDays})`;
        return desc;
    }
}

export function calculateFeeProration(amount: number, paidUntil: Date, handoverDate: Date, handoverToBuyer: boolean) {
    const cutoffDate = handoverToBuyer ? handoverDate : addDays(handoverDate, 1);
    let pUntil = new Date(paidUntil); pUntil.setHours(0, 0, 0, 0);
    if (isNaN(pUntil.getTime())) return { buyerPaysSeller: 0, sellerPaysBuyer: 0, breakdown: '日期錯誤' };
    let cDate = new Date(cutoffDate); cDate.setHours(0, 0, 0, 0);

    if (pUntil >= cDate) {
        const buyerPaysSeller = calculateProratedRent(amount, cDate, pUntil);
        const detailDesc = getDetailedFeeDescription(amount, cDate, pUntil, true);
        return { buyerPaysSeller, sellerPaysBuyer: 0, breakdown: `【買方補貼預繳】\n期間: ${roDate(cDate)} ~ ${roDate(pUntil)}\n${detailDesc}` };
    } else {
        const startArrears = addDays(pUntil, 1);
        const endArrears = addDays(cDate, -1);
        if (startArrears <= endArrears) {
            const sellerPaysBuyer = calculateProratedRent(amount, startArrears, endArrears);
            const detailDesc = getDetailedFeeDescription(amount, startArrears, endArrears, false);
            return { buyerPaysSeller: 0, sellerPaysBuyer, breakdown: `【賣方補足欠費】\n期間: ${roDate(startArrears)} ~ ${roDate(endArrears)}\n${detailDesc}` };
        }
        return { buyerPaysSeller: 0, sellerPaysBuyer: 0, breakdown: "無需找補 (已結清)" };
    }
}

export function calculateRentProration(monthlyRent: number, paidUntil: Date, handoverDate: Date, handoverToBuyer: boolean) {
    const cutoffDate = handoverToBuyer ? handoverDate : addDays(handoverDate, 1);
    let pUntil = new Date(paidUntil); pUntil.setHours(0, 0, 0, 0);
    if (isNaN(pUntil.getTime())) return { buyerPaysSeller: 0, sellerPaysBuyer: 0, breakdown: '日期錯誤' };
    let cDate = new Date(cutoffDate); cDate.setHours(0, 0, 0, 0);

    if (pUntil >= cDate) {
        const sellerPaysBuyer = calculateProratedRent(monthlyRent, cDate, pUntil);
        const detailDesc = getDetailedFeeDescription(monthlyRent, cDate, pUntil, true);
        return { buyerPaysSeller: 0, sellerPaysBuyer, breakdown: `【賣方補貼買方 - 預收租金】\n期間: ${roDate(cDate)} ~ ${roDate(pUntil)}\n${detailDesc}\n(賣方預收了買方持有期間的租金，要退還買方)` };
    } else {
        const startArrears = addDays(pUntil, 1);
        const endArrears = addDays(cDate, -1);
        if (startArrears <= endArrears) {
            const buyerPaysSeller = calculateProratedRent(monthlyRent, startArrears, endArrears);
            const detailDesc = getDetailedFeeDescription(monthlyRent, startArrears, endArrears, false);
            return { buyerPaysSeller, sellerPaysBuyer: 0, breakdown: `【買方補貼賣方 - 欠繳租金】\n期間: ${roDate(startArrears)} ~ ${roDate(endArrears)}\n${detailDesc}\n(租客欠繳賣方持有期間的租金，由買方代墊)` };
        }
        return { buyerPaysSeller: 0, sellerPaysBuyer: 0, breakdown: "無需找補 (已結清)" };
    }
}
