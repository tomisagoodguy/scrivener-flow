import { currentMonthInTaipei } from './agingUtils';

/** `YYYY-MM`，月份 01–12 */
export const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 月份欄位的值是否值得導覽；鍵盤逐字輸入年份時會出現 0002-10 這類中間值 */
export function isNavigableMonth(value: string): boolean {
    return MONTH_PATTERN.test(value) && Number(value.slice(0, 4)) >= 1900;
}

/** 歷史篩選的 URL 參數：不合法的月份退回本月、不合法的地政士退回全部 */
export function normalizeHistoryParams(
    month: string | undefined,
    scrivenerId: string | undefined,
    now: Date = new Date()
): { month: string; scrivenerId: string } {
    return {
        month: month && MONTH_PATTERN.test(month) ? month : currentMonthInTaipei(now),
        scrivenerId: scrivenerId && UUID_PATTERN.test(scrivenerId) ? scrivenerId : '',
    };
}
