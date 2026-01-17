import {
    addDays,
    addMonths,
    addWeeks,
    isWeekend,
    isFriday,
    isWednesday,
    endOfMonth,
    subDays,
    getDay,
    nextWednesday,
    nextFriday,
    isSameDay,
    format,
} from 'date-fns';

// 判斷是否為工作日 (目前簡單過濾六日，國定假日需額外維護清單)
const isWorkDay = (date: Date) => !isWeekend(date);

// 增加工作天
const addWorkDays = (startDate: Date, days: number): Date => {
    let count = 0;
    let currentDate = startDate;
    while (count < days) {
        currentDate = addDays(currentDate, 1);
        if (isWorkDay(currentDate)) {
            count++;
        }
    }
    return currentDate;
};

// 調整至最近的週三或週五 (往後找)
const adjustToWedOrFri = (date: Date): Date => {
    if (isWednesday(date) || isFriday(date)) return date;

    // 尋找下一個週三與週五，取最近的
    const nextWed = nextWednesday(date);
    const nextFri = nextFriday(date);

    return nextWed < nextFri ? nextWed : nextFri;
};

// 檢查是否為月底前一天 (例如 1/30 (若1月有31天), 2/27 (若2月有28天))
const isDayBeforeMonthEnd = (date: Date): boolean => {
    const lastDay = endOfMonth(date);
    const dayBeforeLast = subDays(lastDay, 1);
    return isSameDay(date, dayBeforeLast);
};

// 調整交屋日
// 規則：優先週五 OR 月底前一天 (不可假日)
// 範圍：完稅日後 1~2 週 (7~14天)
const calculateHandoverDate = (taxDate: Date): Date => {
    // 預設抓完稅後約 10 天 (取中間值)
    let target = addDays(taxDate, 10);

    // 策略：在這個區間內 (Tax+7 ~ Tax+14)，尋找符合「週五」或「月底前一天」且「非假日」的最佳日期
    const candidates: Date[] = [];
    const minDate = addDays(taxDate, 7);
    const maxDate = addDays(taxDate, 14);

    let curr = minDate;
    while (curr <= maxDate) {
        if (!isWeekend(curr)) {
            if (isFriday(curr) || isDayBeforeMonthEnd(curr)) {
                candidates.push(curr);
            }
        }
        curr = addDays(curr, 1);
    }

    // 如果有候選日期，選最早的，或者選週五優先
    if (candidates.length > 0) {
        // 排序候選：優先選週五
        const best = candidates.find((d) => isFriday(d)) || candidates[0];
        return best;
    }

    // 如果區間內都沒有完美日期，就找區間內的任何一個工作日 (優先週五 > 週四 > ...)
    // 這裡簡單處理：直接調整 Target 為非假日
    while (isWeekend(target)) {
        // 假日往前推 (user: 連續假日提前2日，這裡模擬遇到假日就往前找工作日)
        target = subDays(target, 1);
    }

    return target;
};

export const calculateMilestoneDates = (contractDateStr: string, taxType: '一般' | '自用' = '一般') => {
    const contractDate = new Date(contractDateStr);
    if (isNaN(contractDate.getTime())) return null;

    // 1. 補差額 (Sign Diff): 簽約 + 3 天 (不含當日，不跳過假日)
    const signDiffDate = addDays(contractDate, 3);

    // 2. 用印 (Seal): 簽約 + 2 個月 -> 調整至週三/週五
    let sealDate = addMonths(contractDate, 2);
    sealDate = adjustToWedOrFri(sealDate);

    // 3. 完稅 (Tax):
    // 一般 -> 用印 + 2週
    // 自用 -> 用印 + 3週
    // 調整至週三/週五
    let taxDate = addWeeks(sealDate, taxType === '一般' ? 2 : 3);
    taxDate = adjustToWedOrFri(taxDate);

    // 4. 交屋 (Handover): 完稅 + 1~2週 -> 特殊規則
    const handoverDate = calculateHandoverDate(taxDate);

    // 5. 代償 (Redemption): 通常在交屋前，或者與交屋同日?
    // 邏輯沒特別指定，暫定同交屋日或交屋前3天?
    // User request didn't specify Redemption logic explicitly, but usually it's before handover.
    // Let's leave redemption empty or set to Handover - 3 days as a placeholder if needed,
    // strictly following prompt: user didn't give logic for Redemption (代償).
    // However, usually Redemption happens before Handover.
    // I will return the calculated dates formatted as YYYY-MM-DD

    const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

    return {
        sign_diff_date: fmt(signDiffDate),
        seal_date: fmt(sealDate),
        tax_payment_date: fmt(taxDate),
        handover_date: fmt(handoverDate),
        // redemption_date: fmt(subDays(handoverDate, 3)) // Optional guess
    };
};
