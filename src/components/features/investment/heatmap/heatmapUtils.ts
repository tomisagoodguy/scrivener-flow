import type { HeatmapStatMode } from '@/types/revenuelab';

/**
 * 根據數值和統計模式回傳背景色（台股慣例：正紅負綠）
 */
export function valueToColor(value: number, mode: HeatmapStatMode): string {
    if (mode === 'stdDev') {
        const intensity = Math.min(Math.max(value / 150, 0), 1);
        const l = 95 - intensity * 45;
        return `hsl(220, 70%, ${l}%)`;
    }
    if (mode === 'positiveRate') {
        const intensity = value / 100;
        const l = 95 - intensity * 50;
        return `hsl(0, 75%, ${l}%)`; // 台股慣例：正值為紅
    }
    if (value < 0) {
        const intensity = Math.min(Math.abs(value) / 100, 1);
        const l = 95 - intensity * 45;
        return `hsl(142, 70%, ${l}%)`; // 台股慣例：負值為綠
    } else {
        const intensity = Math.min(value / 200, 1);
        const l = 95 - intensity * 50;
        return `hsl(0, 75%, ${l}%)`; // 台股慣例：正值為紅
    }
}

/**
 * 根據數值和統計模式回傳 Tailwind 文字顏色 class
 */
export function textColorClass(value: number, mode: HeatmapStatMode): string {
    if (mode === 'stdDev') return value > 80 ? 'text-blue-900' : 'text-blue-700';
    if (mode === 'positiveRate') return value > 60 ? 'text-red-900' : 'text-red-700';
    return value < -30
        ? 'text-emerald-900'
        : value < 0
          ? 'text-emerald-700'
          : value > 80
            ? 'text-red-900'
            : 'text-red-700';
}

/**
 * 將 "YYYY-MM" 格式的月份字串轉為中文月份名稱
 */
export function formatMonth(month: string): string {
    const parts = month.split('-');
    const m = parts[1];
    const monthNames = [
        '',
        '1月', '2月', '3月', '4月', '5月', '6月',
        '7月', '8月', '9月', '10月', '11月', '12月',
    ];
    return monthNames[Number(m)] ?? month;
}
