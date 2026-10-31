/**
 * buildTradeLabels（change: strategy-chart-trade-labels, task 2.1）：
 * 買進日「買」在 K 棒最高價上方、出場日「賣」在最低價下方；略過快照外與未畫成 K 棒的日期。
 */

import type { BareKSnapshot } from '@/app/api/investment/bare-k/[code]/route';
import { toTime } from '../BareKChartConfig';
import { buildTradeLabels, labelAnchorY, stackLabelTops } from '../BareKTradeLabels';

jest.mock('lightweight-charts', () => ({}), { virtual: true });

type Bar = BareKSnapshot['ohlcv'][number];

function bar(date: string, low: number | null, high: number | null): Bar {
    const mid = low === null || high === null ? null : (low + high) / 2;
    return { date, o: mid, h: high, l: low, c: mid, v: 1000, change_pct: 0 };
}

const OHLCV: BareKSnapshot['ohlcv'] = [
    bar('2026-09-30', 90, 110),
    bar('2026-10-01', 95, 120),
    bar('2026-10-13', 100, 130),
    bar('2026-10-15', 105, 125),
];

describe('buildTradeLabels', () => {
    it('買進日「買」取最高價在上、出場日「賣」取最低價在下，選股日不標', () => {
        const labels = buildTradeLabels(OHLCV, {
            entryDates: ['2026-10-01'],
            exitDates: ['2026-10-15'],
            periods: [{ start: '2026-10-01', end: '2026-10-15' }],
        });

        expect(labels).toEqual([
            { time: toTime('2026-10-01'), price: 120, text: '買', color: '#e11d48', position: 'above' },
            { time: toTime('2026-10-15'), price: 105, text: '賣', color: '#059669', position: 'below' },
        ]);
    });

    it('持有中（無出場日）只有「買」', () => {
        const labels = buildTradeLabels(OHLCV, { entryDates: ['2026-10-13'], exitDates: [], periods: [] });

        expect(labels.map(l => l.text)).toEqual(['買']);
    });

    it('快照外日期與 o/c 為 null 的日期略過、重複日期只標一次、依時間遞增', () => {
        const ohlcv = [...OHLCV, bar('2026-10-20', null, null)];
        const labels = buildTradeLabels(ohlcv, {
            entryDates: ['2026-10-13', '2025-01-02', '2026-10-01', '2026-10-01'],
            exitDates: ['2026-10-20'],
            periods: [],
        });

        expect(labels.map(l => [l.time, l.text])).toEqual([
            [toTime('2026-10-01'), '買'],
            [toTime('2026-10-13'), '買'],
        ]);
    });
});

describe('labelAnchorY（change: strategy-chart-label-clearance）', () => {
    it('「買」取標籤覆蓋範圍內最高的 K 棒頂（spec 範例 1 → 40）', () => {
        const bars = [
            { x: 96, highY: 50, lowY: 80 },
            { x: 100, highY: 60, lowY: 90 },
            { x: 104, highY: 40, lowY: 70 },
            { x: 130, highY: 10, lowY: 20 },
        ];
        expect(labelAnchorY('above', 100, bars, 12)).toBe(40);
    });

    it('「賣」取標籤覆蓋範圍內最低的 K 棒底（spec 範例 2 → 95）', () => {
        const bars = [
            { x: 96, highY: 50, lowY: 80 },
            { x: 100, highY: 60, lowY: 90 },
            { x: 104, highY: 40, lowY: 95 },
            { x: 130, highY: 10, lowY: 120 },
        ];
        expect(labelAnchorY('below', 100, bars, 12)).toBe(95);
    });

    it('範圍內沒有 K 棒 → null', () => {
        expect(labelAnchorY('above', 100, [{ x: 200, highY: 10, lowY: 20 }], 12)).toBeNull();
    });
});

describe('stackLabelTops（change: strategy-chart-label-stacking）', () => {
    it('同側相鄰「買」往上錯開（spec 範例表 1–4 列 → 50, 32, 16, 50）', () => {
        const tops = stackLabelTops([
            { x: 100, top: 50, position: 'above' },
            { x: 108, top: 50, position: 'above' },
            { x: 112, top: 52, position: 'above' },
            { x: 140, top: 50, position: 'above' },
        ], 20, 16, 2);
        expect(tops).toEqual([50, 32, 16, 50]);
    });

    it('同側相鄰「賣」往下錯開（spec 範例表第 5 列 → 98）', () => {
        expect(stackLabelTops([
            { x: 100, top: 78, position: 'below' },
            { x: 104, top: 80, position: 'below' },
        ], 20, 16, 2)).toEqual([78, 98]);
    });

    it('「買」與「賣」分屬兩側，不互相避讓', () => {
        expect(stackLabelTops([
            { x: 100, top: 50, position: 'above' },
            { x: 102, top: 50, position: 'below' },
        ], 20, 16, 2)).toEqual([50, 50]);
    });
});
