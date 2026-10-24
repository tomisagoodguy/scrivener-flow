/**
 * buildSignalMarkers：裸K K 線面板的「均線發散入選日」箭頭標記（純函式）。
 * TDD: written BEFORE implementation.
 */

import type { BareKSnapshot } from '@/app/api/investment/bare-k/[code]/route';
import { toTime } from '../BareKChartConfig';
import { buildSignalMarkers } from '../BareKChartPanels';

// virtual: lightweight-charts 5.x 的 exports 只有 `import` 條件（純 ESM），Jest(CJS) 無法 resolve 真實模組
jest.mock('lightweight-charts', () => ({
    ColorType: { Solid: 'solid' },
    CandlestickSeries: { kind: 'Candlestick' },
    HistogramSeries: { kind: 'Histogram' },
    LineSeries: { kind: 'Line' },
    createChart: jest.fn(),
    createSeriesMarkers: jest.fn(),
}), { virtual: true });

type Bar = BareKSnapshot['ohlcv'][number];

function bar(date: string, close: number | null = 100): Bar {
    return {
        date,
        o: close,
        h: close,
        l: close,
        c: close,
        v: 1000,
        change_pct: 0,
    };
}

const OHLCV: BareKSnapshot['ohlcv'] = [
    bar('2026-10-17'),
    bar('2026-10-22'),
    bar('2026-10-23'),
];

describe('buildSignalMarkers', () => {
    it('只為 ohlcv 內存在的日期產生 marker（10-20 不在 ohlcv 被略過）', () => {
        const markers = buildSignalMarkers(OHLCV, ['2026-10-17', '2026-10-20', '2026-10-23']);

        expect(markers).toHaveLength(2);
        expect(markers.map(m => m.time)).toEqual([toTime('2026-10-17'), toTime('2026-10-23')]);
    });

    it('marker 為 K 棒下方向上箭頭，台股紅 #e11d48', () => {
        const markers = buildSignalMarkers(OHLCV, ['2026-10-17', '2026-10-23']);

        expect(markers.length).toBeGreaterThan(0);
        for (const m of markers) {
            expect(m.position).toBe('belowBar');
            expect(m.shape).toBe('arrowUp');
            expect(m.color).toBe('#e11d48');
        }
    });

    it('markerDates 為空 → 回傳空陣列', () => {
        expect(buildSignalMarkers(OHLCV, [])).toEqual([]);
    });

    it('markerDates 全部不在 ohlcv → 回傳空陣列', () => {
        expect(buildSignalMarkers(OHLCV, ['2026-09-01', '2026-10-20'])).toEqual([]);
    });

    it('亂序輸入 → 輸出依時間遞增', () => {
        const markers = buildSignalMarkers(OHLCV, ['2026-10-23', '2026-10-17', '2026-10-22']);
        const times = markers.map(m => Number(m.time));

        expect(times).toEqual([toTime('2026-10-17'), toTime('2026-10-22'), toTime('2026-10-23')]);
        expect(times).toEqual([...times].sort((a, b) => a - b));
    });

    it('重複日期只留一個 marker', () => {
        const markers = buildSignalMarkers(OHLCV, ['2026-10-22', '2026-10-22', '2026-10-17', '2026-10-22']);

        expect(markers.map(m => m.time)).toEqual([toTime('2026-10-17'), toTime('2026-10-22')]);
    });

    it('ohlcv 該日 o/c 為 null（未畫成 K 棒）→ 不產生 marker', () => {
        const ohlcv: BareKSnapshot['ohlcv'] = [bar('2026-10-17'), bar('2026-10-22', null), bar('2026-10-23')];
        const markers = buildSignalMarkers(ohlcv, ['2026-10-17', '2026-10-22', '2026-10-23']);

        expect(markers.map(m => m.time)).toEqual([toTime('2026-10-17'), toTime('2026-10-23')]);
    });
});
