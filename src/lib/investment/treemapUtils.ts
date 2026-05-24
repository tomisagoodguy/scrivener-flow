export type HeatmapPeriod = '1d' | '5d' | '20d';

export interface TreemapItem {
    id: string;
    value: number;
    pct: number | null;
    label: string;
    [key: string]: unknown;
}

export interface BlockRect<T extends TreemapItem = TreemapItem> {
    x: number;
    y: number;
    width: number;
    height: number;
    item: T;
}

// Taiwan convention: red = up, green = down
export function blockColor(pct: number | null): string {
    if (pct === null) return '#e5e7eb';
    if (pct >= 5) return '#7f1d1d';
    if (pct >= 3) return '#991b1b';
    if (pct >= 1.5) return '#dc2626';
    if (pct >= 0.5) return '#f87171';
    if (pct >= 0) return '#fecaca';
    if (pct >= -0.5) return '#bbf7d0';
    if (pct >= -1.5) return '#4ade80';
    if (pct >= -3) return '#16a34a';
    return '#14532d';
}

export function textColor(pct: number | null): string {
    if (pct === null) return '#374151';
    return Math.abs(pct) < 0.5 ? '#374151' : '#ffffff';
}

export function computeTreemap<T extends TreemapItem>(
    items: T[],
    cw: number,
    ch: number,
): BlockRect<T>[] {
    if (!items.length || cw <= 0 || ch <= 0) return [];

    const sorted = [...items].sort((a, b) => b.value - a.value);
    const result: BlockRect<T>[] = [];

    function split(arr: T[], x0: number, y0: number, x1: number, y1: number) {
        if (!arr.length) return;
        if (arr.length === 1) {
            result.push({ x: x0, y: y0, width: x1 - x0, height: y1 - y0, item: arr[0] });
            return;
        }
        const total = arr.reduce((s, d) => s + d.value, 0);
        let cum = 0;
        let splitIdx = arr.length - 1;
        for (let i = 0; i < arr.length - 1; i++) {
            cum += arr[i].value;
            if (cum >= total / 2) { splitIdx = i + 1; break; }
        }
        const leftVal = arr.slice(0, splitIdx).reduce((s, d) => s + d.value, 0);
        const ratio = leftVal / total;
        const w = x1 - x0, h = y1 - y0;
        if (w >= h) {
            const mid = x0 + ratio * w;
            split(arr.slice(0, splitIdx), x0, y0, mid, y1);
            split(arr.slice(splitIdx), mid, y0, x1, y1);
        } else {
            const mid = y0 + ratio * h;
            split(arr.slice(0, splitIdx), x0, y0, x1, mid);
            split(arr.slice(splitIdx), x0, mid, x1, y1);
        }
    }

    split(sorted, 0, 0, cw, ch);
    return result;
}
