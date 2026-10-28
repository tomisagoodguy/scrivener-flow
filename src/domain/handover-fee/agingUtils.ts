/** 遞牌費帳齡：一律以台北時區的日期計算，避免伺服器 UTC 差一天 */

export type AgingLevel = 'none' | 'orange' | 'red';

const DAY_MS = 24 * 60 * 60 * 1000;

const taipeiDateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});

/** 台北時區今天的 `YYYY-MM-DD` */
export function todayInTaipei(now: Date = new Date()): string {
    return taipeiDateFormatter.format(now);
}

/** 台北時區本月的 `YYYY-MM` */
export function currentMonthInTaipei(now: Date = new Date()): string {
    return todayInTaipei(now).slice(0, 7);
}

/** 兩個 `YYYY-MM-DD` 之間的整數天差（today - feeDate） */
export function ageInDays(feeDate: string, today: string): number {
    return Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${feeDate}T00:00:00Z`)) / DAY_MS);
}

/** 超過 7 天紅色、超過 3 天橘色 */
export function agingLevel(age: number): AgingLevel {
    if (age > 7) return 'red';
    if (age > 3) return 'orange';
    return 'none';
}
