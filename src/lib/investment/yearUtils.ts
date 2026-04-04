/**
 * 產生可用年份陣列，預設從 startYear 到當前年份
 */
export function generateAvailableYears(startYear: number, endYear?: number): number[] {
    const end = endYear ?? new Date().getFullYear();
    const years: number[] = [];
    for (let y = end; y >= startYear; y--) {
        years.push(y);
    }
    return years;
}

/** 營收熱力圖可用年份（2020 起） */
export const REVENUE_HEATMAP_YEARS = generateAvailableYears(2020);

/** 勝率實驗室可用年份（2025 起） */
export const WIN_RATE_LAB_YEARS = generateAvailableYears(2025);
