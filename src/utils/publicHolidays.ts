/**
 * 台灣政府行政機關辦公日曆 (2026年)
 * 資料來源：行政院人事行政總處
 * https://www.dgpa.gov.tw/information?uid=41&pid=12573
 * 
 * 2026 年共有 9 個連假，全年休假日 120 天
 * 2026 年補班日：無
 */

export interface PublicHoliday {
    date: string; // YYYY-MM-DD 格式
    name: string; // 假期名稱
    type: 'holiday' | 'compensatory' | 'workday'; // holiday: 例假日, compensatory: 補假, workday: 補班日
    category?: 'spring-festival' | 'national' | 'traditional' | 'memorial' | 'labor'; // 假期分類
}

/**
 * 2026年 (民國115年) 政府行政機關辦公日曆表
 */
export const publicHolidays2026: PublicHoliday[] = [
    // ========== 1. 開國紀念日 ==========
    { date: '2026-01-01', name: '開國紀念日', type: 'holiday', category: 'national' },

    // ========== 2. 春節連假 (2/14-2/22，共 9 天) ==========
    { date: '2026-02-14', name: '春節連假', type: 'holiday', category: 'spring-festival' },
    { date: '2026-02-15', name: '春節連假', type: 'holiday', category: 'spring-festival' },
    { date: '2026-02-16', name: '農曆除夕', type: 'holiday', category: 'spring-festival' },
    { date: '2026-02-17', name: '春節初一', type: 'holiday', category: 'spring-festival' },
    { date: '2026-02-18', name: '春節初二', type: 'holiday', category: 'spring-festival' },
    { date: '2026-02-19', name: '春節初三', type: 'holiday', category: 'spring-festival' },
    { date: '2026-02-20', name: '春節初四', type: 'holiday', category: 'spring-festival' },
    { date: '2026-02-21', name: '春節初五', type: 'holiday', category: 'spring-festival' },
    { date: '2026-02-22', name: '春節連假', type: 'holiday', category: 'spring-festival' },

    // ========== 3. 228 和平紀念日連假 (2/27-3/1，共 3 天) ==========
    { date: '2026-02-27', name: '和平紀念日連假', type: 'holiday', category: 'memorial' },
    { date: '2026-02-28', name: '和平紀念日', type: 'holiday', category: 'memorial' },
    { date: '2026-03-01', name: '和平紀念日連假', type: 'holiday', category: 'memorial' },

    // ========== 4. 清明節連假 (4/3-4/6，共 4 天) ==========
    { date: '2026-04-03', name: '清明節連假', type: 'holiday', category: 'traditional' },
    { date: '2026-04-04', name: '兒童節/清明節', type: 'holiday', category: 'traditional' },
    { date: '2026-04-05', name: '清明節連假', type: 'holiday', category: 'traditional' },
    { date: '2026-04-06', name: '清明節補假', type: 'compensatory', category: 'traditional' },

    // ========== 5. 勞動節連假 (5/1-5/3，共 3 天) ==========
    { date: '2026-05-01', name: '勞動節', type: 'holiday', category: 'labor' },
    { date: '2026-05-02', name: '勞動節連假', type: 'holiday', category: 'labor' },
    { date: '2026-05-03', name: '勞動節連假', type: 'holiday', category: 'labor' },

    // ========== 6. 端午節連假 (6/19-6/21，共 3 天) ==========
    { date: '2026-06-19', name: '端午節連假', type: 'holiday', category: 'traditional' },
    { date: '2026-06-20', name: '端午節', type: 'holiday', category: 'traditional' },
    { date: '2026-06-21', name: '端午節連假', type: 'holiday', category: 'traditional' },

    // ========== 7. 教師節 + 中秋節連假 (9/25-9/28，共 4 天) ==========
    { date: '2026-09-25', name: '中秋節連假', type: 'holiday', category: 'traditional' },
    { date: '2026-09-26', name: '中秋節', type: 'holiday', category: 'traditional' },
    { date: '2026-09-27', name: '中秋節連假', type: 'holiday', category: 'traditional' },
    { date: '2026-09-28', name: '教師節', type: 'holiday', category: 'memorial' },

    // ========== 8. 國慶日連假 (10/9-10/11，共 3 天) ==========
    { date: '2026-10-09', name: '國慶連假', type: 'holiday', category: 'national' },
    { date: '2026-10-10', name: '國慶日', type: 'holiday', category: 'national' },
    { date: '2026-10-11', name: '國慶連假', type: 'holiday', category: 'national' },

    // ========== 9. 光復節連假 (10/24-10/26，共 3 天) ==========
    { date: '2026-10-24', name: '光復節連假', type: 'holiday', category: 'national' },
    { date: '2026-10-25', name: '台灣光復節', type: 'holiday', category: 'national' },
    { date: '2026-10-26', name: '光復節補假', type: 'compensatory', category: 'national' },

    // ========== 10. 行憲紀念日連假 (12/25-12/27，共 3 天) ==========
    { date: '2026-12-25', name: '行憲紀念日', type: 'holiday', category: 'memorial' },
    { date: '2026-12-26', name: '行憲紀念日連假', type: 'holiday', category: 'memorial' },
    { date: '2026-12-27', name: '行憲紀念日連假', type: 'holiday', category: 'memorial' },
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
    // 春節：最熱烈的紅色系
    if (holiday.category === 'spring-festival') {
        return {
            bg: 'bg-gradient-to-br from-red-500 to-rose-600',
            border: 'border-red-200',
            text: 'text-white',
        };
    }

    // 國定假日：使用莊重的藍色系
    if (holiday.category === 'national') {
        return {
            bg: 'bg-gradient-to-br from-blue-500 to-indigo-600',
            border: 'border-blue-200',
            text: 'text-white',
        };
    }

    // 傳統節日：使用溫暖的橘色系
    if (holiday.category === 'traditional') {
        return {
            bg: 'bg-gradient-to-br from-orange-400 to-amber-500',
            border: 'border-orange-200',
            text: 'text-white',
        };
    }

    // 紀念日：使用紫色系
    if (holiday.category === 'memorial') {
        return {
            bg: 'bg-gradient-to-br from-purple-400 to-violet-500',
            border: 'border-purple-200',
            text: 'text-white',
        };
    }

    // 勞動節：使用綠色系
    if (holiday.category === 'labor') {
        return {
            bg: 'bg-gradient-to-br from-green-400 to-emerald-500',
            border: 'border-green-200',
            text: 'text-white',
        };
    }

    // 補班日：使用灰色警告（2026 年無補班日）
    if (holiday.type === 'workday') {
        return {
            bg: 'bg-gradient-to-br from-slate-400 to-slate-500',
            border: 'border-slate-300',
            text: 'text-white',
        };
    }

    // 其他：柔和的綠色系
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

/**
 * 取得假期摘要資訊
 */
export function getHolidaySummary() {
    return {
        totalDays: 120,
        totalHolidays: 9,
        hasWorkday: false, // 2026 年無補班日
        springFestival: { start: '2026-02-14', end: '2026-02-22', days: 9 },
        summerBreak: { start: '2026-07-01', end: '2026-08-30' },
        winterBreak: { start: '2026-01-24', end: '2026-02-22' },
    };
}
