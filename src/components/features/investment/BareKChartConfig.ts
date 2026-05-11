import { ColorType } from 'lightweight-charts';

export const C = {
    ma5:      '#F39C12',
    ma20:     '#2E86C1',
    ma60:     '#8E44AD',
    ma120:    '#717D7E',
    h260:     '#E74C3C',
    up:       '#E74C3C',
    down:     '#27AE60',
    vol_ma:   '#F39C12',
    margin:   '#2E86C1',
    yoy_pos:  '#C0392B',
    yoy_neg:  '#27AE60',
    mom:      '#E67E22',
    big:      '#E74C3C',
    small:    '#27AE60',
    grid:     'rgba(200,200,200,0.25)',
    bg:       'transparent',
    text:     '#555',
} as const;

export const SIGNAL_META = [
    { key: 'hit260',    label: '創260高', color: '#E74C3C' },
    { key: 'low_vol',   label: '低波動',  color: '#27AE60' },
    { key: 'margin_ok', label: '融資健康', color: '#2E86C1' },
    { key: 'rev_9max',  label: '營收9月高', color: '#F39C12' },
    { key: 'trust_ok',  label: '投信買超', color: '#8E44AD' },
] as const;

export type SignalKey = (typeof SIGNAL_META)[number]['key'];

export function toTime(dateStr: string): number {
    return Math.floor(new Date(dateStr).getTime() / 1000);
}

export function rollingMean(arr: (number | null)[], n: number): (number | null)[] {
    return arr.map((_, i) => {
        if (i < n - 1) return null;
        const slice = arr.slice(i - n + 1, i + 1).filter((v) => v !== null) as number[];
        return slice.length > 0 ? slice.reduce((a, b) => a + b, 0) / slice.length : null;
    });
}

export function baseChartOptions(height: number, hideTimeScale = true) {
    return {
        height,
        layout: {
            background: { type: ColorType.Solid as const, color: C.bg },
            textColor: C.text,
            fontSize: 10,
        },
        grid: {
            vertLines: { color: C.grid },
            horzLines: { color: C.grid },
        },
        rightPriceScale: { borderColor: 'rgba(180,180,180,0.3)', scaleMargins: { top: 0.05, bottom: 0.05 } },
        crosshair: { mode: 1 },
        timeScale: {
            borderColor: 'rgba(180,180,180,0.3)',
            visible: !hideTimeScale,
            timeVisible: !hideTimeScale,
        },
        handleScale: false,
        handleScroll: false,
    };
}
