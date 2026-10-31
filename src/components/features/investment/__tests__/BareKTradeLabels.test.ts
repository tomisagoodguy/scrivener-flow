/**
 * buildTradeLabels（change: strategy-chart-trade-labels, task 2.1）：
 * 買進日「買」在 K 棒最高價上方、出場日「賣」在最低價下方；略過快照外與未畫成 K 棒的日期。
 */

import type { BareKSnapshot } from '@/app/api/investment/bare-k/[code]/route';
import { toTime } from '../BareKChartConfig';
import { buildTradeLabels } from '../BareKTradeLabels';

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
