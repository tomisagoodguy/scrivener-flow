/**
 * 台灣政府行政機關辦公日曆 (2026年)
 * 資料來源：行政院人事行政總處
 * https://www.dgpa.gov.tw/information?uid=41&pid=12573
 */

export interface PublicHoliday {
    date: string; // YYYY-MM-DD 格式
    name: string; // 假期名稱
    type: 'holiday' | 'compensatory' | 'workday'; // holiday: 例假日, compensatory: 補假, workday: 補班日
}

/**
 * 2026年 (民國115年) 政府行政機關辦公日曆表
 * 
 * 說明：
 * - 三天以上之連續假期，其前一個上班日為調整放假日，
 *   該上班日之前一週六實施補行上班
 */
export const publicHolidays2026: PublicHoliday[] = [
    // ========== 1月 ==========
    { date: '2026-01-01', name: '開國紀念日', type: 'holiday' },
    { date: '2026-01-02', name: '開國紀念日補假', type: 'compensatory' },
    { date: '2026-01-03', name: '開國紀念日補假', type: 'compensatory' },

    // ========== 春節假期 (1/27-2/4) ==========
    { date: '2026-01-24', name: '彈性補班日', type: 'workday' }, // 週六補班 (補 1/30 週五)
    { date: '2026-01-27', name: '農曆除夕前一日', type: 'holiday' },
    { date: '2026-01-28', name: '農曆除夕', type: 'holiday' },
    { date: '2026-01-29', name: '春節初一', type: 'holiday' },
    { date: '2026-01-30', name: '春節初二 (彈性放假)', type: 'compensatory' }, // 與 1/24 對調
    { date: '2026-01-31', name: '春節初三', type: 'holiday' },
    { date: '2026-02-01', name: '春節初四', type: 'holiday' },
    { date: '2026-02-02', name: '春節初五', type: 'holiday' },
    { date: '2026-02-03', name: '春節初六 (彈性放假)', type: 'compensatory' }, // 與 2/7 對調
    { date: '2026-02-04', name: '春節初七 (彈性放假)', type: 'compensatory' }, // 與 2/14 對調

    { date: '2026-02-07', name: '彈性補班日', type: 'workday' }, // 週六補班 (補 2/3 週二)
    { date: '2026-02-14', name: '彈性補班日', type: 'workday' }, // 週六補班 (補 2/4 週三)

    // ========== 228和平紀念日 (2/28-3/2) ==========
    { date: '2026-02-27', name: '彈性放假', type: 'compensatory' }, // 與 2/21 對調
    { date: '2026-02-28', name: '和平紀念日', type: 'holiday' },
    // 3/1 (日) 本來就是假日，3/2 (一) 補假 → 但民間行事曆可能不明確標註

    { date: '2026-02-21', name: '彈性補班日', type: 'workday' }, // 週六補班 (補 2/27 週五)

    // ========== 兒童節與清明節連假 (4/3-4/6) ==========
    { date: '2026-04-03', name: '兒童節 (彈性放假)', type: 'compensatory' }, // 與 3/28 對調
    { date: '2026-04-04', name: '清明節', type: 'holiday' },
    { date: '2026-04-05', name: '兒童節補假', type: 'compensatory' }, // 4/4 清明適逢週六，童節補假至週日
    { date: '2026-04-06', name: '補假', type: 'compensatory' },

    { date: '2026-03-28', name: '彈性補班日', type: 'workday' }, // 週六補班 (補 4/3 週五)

    // ========== 端午節 (6/19-6/21) ==========
    { date: '2026-06-19', name: '端午節', type: 'holiday' },
    { date: '2026-06-20', name: '端午節連假', type: 'holiday' },
    { date: '2026-06-21', name: '端午節連假', type: 'holiday' },

    // ========== 中秋節 (10/3-10/5) ==========
    { date: '2026-10-03', name: '中秋節', type: 'holiday' },
    { date: '2026-10-04', name: '中秋節連假', type: 'holiday' },
    { date: '2026-10-05', name: '中秋節補假', type: 'compensatory' },

    // ========== 國慶日 (10/9-10-11) ==========
    { date: '2026-10-09', name: '國慶日調整放假', type: 'compensatory' }, // 與 9/26 對調
    { date: '2026-10-10', name: '國慶日', type: 'holiday' },
    { date: '2026-10-11', name: '國慶日連假', type: 'holiday' },

    { date: '2026-09-26', name: '彈性補班日', type: 'workday' }, // 週六補班 (補 10/9 週五)
];

/**
 * 取得指定日期的假期資訊
 */
export function getHolidayByDate(date: Date): PublicHoliday | undefined {
    const dateStr = date.toISOString().split('T')[0];
    return publicHolidays2026.find((h) => h.date === dateStr);
}

/**
 * 檢查指定日期是否為假日 (包含例假日與補假，但不包含補班日)
 */
export function isPublicHoliday(date: Date): boolean {
    const holiday = getHolidayByDate(date);
    return holiday ? holiday.type !== 'workday' : false;
}

/**
 * 檢查指定日期是否為補班日
 */
export function isWorkday(date: Date): boolean {
    const holiday = getHolidayByDate(date);
    return holiday?.type === 'workday';
}

/**
 * 取得假期顏色配置
 */
export function getHolidayColor(holiday: PublicHoliday): {
    bg: string;
    border: string;
    text: string;
} {
    // 國定假日：使用熱烈的紅色系
    if (
        holiday.name.includes('春節') ||
        holiday.name.includes('除夕') ||
        holiday.name.includes('國慶')
    ) {
        return {
            bg: 'bg-gradient-to-br from-red-500 to-rose-600',
            border: 'border-red-200',
            text: 'text-white',
        };
    }

    // 傳統節日：使用溫暖的橘色系
    if (
        holiday.name.includes('端午') ||
        holiday.name.includes('中秋') ||
        holiday.name.includes('清明')
    ) {
        return {
            bg: 'bg-gradient-to-br from-orange-400 to-amber-500',
            border: 'border-orange-200',
            text: 'text-white',
        };
    }

    // 紀念日：使用莊重的藍色系
    if (
        holiday.name.includes('開國') ||
        holiday.name.includes('和平') ||
        holiday.name.includes('兒童節')
    ) {
        return {
            bg: 'bg-gradient-to-br from-blue-400 to-indigo-500',
            border: 'border-blue-200',
            text: 'text-white',
        };
    }

    // 補班日：使用灰色警告
    if (holiday.type === 'workday') {
        return {
            bg: 'bg-gradient-to-br from-slate-400 to-slate-500',
            border: 'border-slate-300',
            text: 'text-white',
        };
    }

    // 彈性放假/補假：使用柔和的綠色系
    return {
        bg: 'bg-gradient-to-br from-emerald-400 to-teal-500',
        border: 'border-emerald-200',
        text: 'text-white',
    };
}

/**
 * 取得指定月份的所有假期
 */
export function getHolidaysInMonth(year: number, month: number): PublicHoliday[] {
    return publicHolidays2026.filter((h) => {
        const [y, m] = h.date.split('-').map(Number);
        return y === year && m === month;
    });
}
