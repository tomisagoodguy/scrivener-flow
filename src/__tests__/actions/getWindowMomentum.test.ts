/**
 * Tests for the window momentum aggregation logic behind getWindowMomentum.
 *
 * Pure aggregation functions live in src/lib/investment/windowMomentumUtils.ts
 * (Server Action 只做 IO，邏輯抽出以便測試，比照 getFundMomentumSignals 模式).
 *
 * Spec: openspec/changes/etf-window-momentum/specs/etf-window-momentum/spec.md
 *   - 同步加碼判定：各 ETF 窗口內淨增持 > 0 才計入家數
 *   - 衍生指標計算公式：吸量比分母 0 / 無 OHLCV → null；吸量趨勢 1.2×/0.8× 邊界
 *   - 排序：家數降冪 → 加碼股數降冪
 */

import {
    aggregateWindowMomentum,
    computeAbsorptionRatio,
    computeAbsorptionTrend,
    splitWindowHalves,
    type WindowDiffEvent,
} from '@/lib/investment/windowMomentumUtils';

const WINDOW_DATES_ASC = ['2026-06-08', '2026-06-09', '2026-06-10', '2026-06-11', '2026-06-12'];

function event(partial: Partial<WindowDiffEvent> & Pick<WindowDiffEvent, 'etf_code' | 'stock_code' | 'diff_shares'>): WindowDiffEvent {
    return {
        stock_name: '測試股',
        data_date: '2026-06-12',
        diff_weight: 0.1,
        ...partial,
    };
}

// ---------------------------------------------------------------------------
// 同步加碼判定：各 ETF 窗口內淨增持 > 0
// ---------------------------------------------------------------------------

describe('net accumulation determination (per-ETF window net > 0)', () => {
    it('counts an ETF with net positive shares (+50000 BUY, +20000 BUY → +70000)', () => {
        const result = aggregateWindowMomentum(
            [
                event({ etf_code: '00981A', stock_code: '2330', diff_shares: 50_000 }),
                event({ etf_code: '00981A', stock_code: '2330', diff_shares: 20_000 }),
            ],
            1,
        );
        expect(result).toHaveLength(1);
        expect(result[0].etfCount).toBe(1);
        expect(result[0].totalAccumulatedShares).toBe(70_000);
    });

    it('excludes an ETF that nets negative (+50000 BUY, -60000 SELL → -10000)', () => {
        const result = aggregateWindowMomentum(
            [
                event({ etf_code: '00981A', stock_code: '2330', diff_shares: 50_000 }),
                event({ etf_code: '00981A', stock_code: '2330', diff_shares: -60_000 }),
            ],
            1,
        );
        expect(result).toHaveLength(0);
    });

    it('excludes an ETF that nets exactly zero (+30000 IN, -30000 SELL → 0)', () => {
        const result = aggregateWindowMomentum(
            [
                event({ etf_code: '00981A', stock_code: '2330', diff_shares: 30_000 }),
                event({ etf_code: '00981A', stock_code: '2330', diff_shares: -30_000 }),
            ],
            1,
        );
        expect(result).toHaveLength(0);
    });

    it('coerces NUMERIC string columns with Number() before arithmetic', () => {
        const result = aggregateWindowMomentum(
            [
                event({ etf_code: '00981A', stock_code: '2330', diff_shares: '50000' as unknown as number, diff_weight: '0.25' as unknown as number }),
            ],
            1,
        );
        expect(result[0].totalAccumulatedShares).toBe(50_000);
        expect(result[0].totalWeightChange).toBeCloseTo(0.25);
    });
});

// ---------------------------------------------------------------------------
// minEtfCount 過濾與排序
// ---------------------------------------------------------------------------

describe('minEtfCount filter and result ordering', () => {
    const events: WindowDiffEvent[] = [
        // 2330: 3 家加碼，總 90000 股
        event({ etf_code: '00981A', stock_code: '2330', diff_shares: 30_000 }),
        event({ etf_code: '00984A', stock_code: '2330', diff_shares: 30_000 }),
        event({ etf_code: '00991A', stock_code: '2330', diff_shares: 30_000 }),
        // 2454: 3 家加碼，總 150000 股（同家數、股數較大 → 排前）
        event({ etf_code: '00981A', stock_code: '2454', diff_shares: 50_000 }),
        event({ etf_code: '00984A', stock_code: '2454', diff_shares: 50_000 }),
        event({ etf_code: '00991A', stock_code: '2454', diff_shares: 50_000 }),
        // 6223: 2 家加碼（1 家淨賣出不計）
        event({ etf_code: '00981A', stock_code: '6223', diff_shares: 999_000 }),
        event({ etf_code: '00984A', stock_code: '6223', diff_shares: 1_000 }),
        event({ etf_code: '00991A', stock_code: '6223', diff_shares: -5_000 }),
    ];

    it('filters out stocks below minEtfCount', () => {
        const result = aggregateWindowMomentum(events, 3);
        expect(result.map((r) => r.stockCode)).not.toContain('6223');
        expect(result).toHaveLength(2);
    });

    it('orders by ETF count desc, then total accumulated shares desc', () => {
        const result = aggregateWindowMomentum(events, 2);
        // 2454 (3家, 150000) → 2330 (3家, 90000) → 6223 (2家, 1000000)
        expect(result.map((r) => r.stockCode)).toEqual(['2454', '2330', '6223']);
    });

    it('only sums shares/weights from accumulating ETFs', () => {
        const result = aggregateWindowMomentum(events, 2);
        const stock6223 = result.find((r) => r.stockCode === '6223');
        expect(stock6223?.etfCount).toBe(2);
        expect(stock6223?.totalAccumulatedShares).toBe(1_000_000);
        expect(stock6223?.etfDetails.map((d) => d.etfCode).sort()).toEqual(['00981A', '00984A']);
    });

    it('tracks max single-event diff_weight within the window', () => {
        const result = aggregateWindowMomentum(
            [
                event({ etf_code: '00981A', stock_code: '2330', diff_shares: 10_000, diff_weight: 0.3 }),
                event({ etf_code: '00981A', stock_code: '2330', diff_shares: 10_000, diff_weight: 1.2 }),
                event({ etf_code: '00984A', stock_code: '2330', diff_shares: 10_000, diff_weight: 0.5 }),
            ],
            1,
        );
        expect(result[0].maxSingleWeightChange).toBeCloseTo(1.2);
    });
});

// ---------------------------------------------------------------------------
// 吸量比（absorption ratio）
// ---------------------------------------------------------------------------

describe('computeAbsorptionRatio', () => {
    it('computes shares / window volume', () => {
        expect(computeAbsorptionRatio(50_000, 1_000_000)).toBeCloseTo(0.05);
    });

    it('returns null when denominator is 0', () => {
        expect(computeAbsorptionRatio(50_000, 0)).toBeNull();
    });

    it('returns null when OHLCV volume is missing', () => {
        expect(computeAbsorptionRatio(50_000, null)).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// 吸量趨勢（absorption trend）：後半 vs 前半，1.2× / 0.8× 門檻
// ---------------------------------------------------------------------------

describe('splitWindowHalves', () => {
    it('gives the extra day to the second half for odd windows (5 → 2+3)', () => {
        const { firstHalf, secondHalf } = splitWindowHalves(WINDOW_DATES_ASC);
        expect(firstHalf).toEqual(['2026-06-08', '2026-06-09']);
        expect(secondHalf).toEqual(['2026-06-10', '2026-06-11', '2026-06-12']);
    });

    it('splits even windows equally (4 → 2+2)', () => {
        const { firstHalf, secondHalf } = splitWindowHalves(WINDOW_DATES_ASC.slice(0, 4));
        expect(firstHalf).toHaveLength(2);
        expect(secondHalf).toHaveLength(2);
    });
});

describe('computeAbsorptionTrend', () => {
    function trendOf(firstHalfShares: number, secondHalfShares: number) {
        // 前半放在第 1 天、後半放在最後 1 天，其餘日為 0
        const sharesByDate: Record<string, number> = {
            '2026-06-08': firstHalfShares,
            '2026-06-12': secondHalfShares,
        };
        return computeAbsorptionTrend(sharesByDate, WINDOW_DATES_ASC);
    }

    it.each([
        [100_000, 130_000, 'accelerating'],
        [100_000, 120_000, 'steady'],
        [100_000, 79_000, 'decaying'],
        [0, 50_000, 'accelerating'],
    ])('first=%d second=%d → %s', (first, second, expected) => {
        expect(trendOf(first, second)).toBe(expected);
    });
});
