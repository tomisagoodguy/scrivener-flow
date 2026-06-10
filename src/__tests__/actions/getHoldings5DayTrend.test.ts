/**
 * Tests for getHoldings5DayTrend pure helpers.
 *
 * 只測試 computeDailyDiff / computeCumulativeDiff 兩個純函式，
 * 不依賴 supabase — server action 本身的整合測試由 E2E 層負責。
 */

import {
    computeDailyDiff,
    computeCumulativeDiff,
    type SnapshotDay,
} from '@/lib/investment/holdingsTrendUtils';

// ─────────────────────────────────────────────────────────────────────────────
// 測試資料工廠
// ─────────────────────────────────────────────────────────────────────────────

function makeDay(date: string, holdings: Array<{ code: string; weight: number; name?: string }>): SnapshotDay {
    return {
        date,
        holdings: holdings.map(({ code, weight, name }) => ({
            stock_code: code,
            stock_name: name ?? null,
            weight,
            rank: null,
        })),
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// computeDailyDiff
// ─────────────────────────────────────────────────────────────────────────────

describe('computeDailyDiff', () => {
    it('threshold boundary: |delta|=1.00 → 納入（>= 1.0）', () => {
        const snapshots: SnapshotDay[] = [
            makeDay('2026-06-01', [{ code: '2330', weight: 5.0, name: '台積電' }]),
            makeDay('2026-06-02', [{ code: '2330', weight: 6.0, name: '台積電' }]),
        ];
        const result = computeDailyDiff(snapshots);
        expect(result).toHaveLength(1);
        expect(result[0].code).toBe('2330');
        expect(result[0].delta).toBeCloseTo(1.0, 2);
    });

    it('threshold boundary: |delta|=0.99 → 不納入（< 1.0）', () => {
        const snapshots: SnapshotDay[] = [
            makeDay('2026-06-01', [{ code: '2330', weight: 5.0 }]),
            makeDay('2026-06-02', [{ code: '2330', weight: 5.99 }]),
        ];
        const result = computeDailyDiff(snapshots);
        expect(result).toHaveLength(0);
    });

    it('threshold boundary: |delta|=2.00 負向 → 納入', () => {
        const snapshots: SnapshotDay[] = [
            makeDay('2026-06-01', [{ code: '2330', weight: 8.0, name: '台積電' }]),
            makeDay('2026-06-02', [{ code: '2330', weight: 6.0, name: '台積電' }]),
        ];
        const result = computeDailyDiff(snapshots);
        expect(result).toHaveLength(1);
        expect(result[0].delta).toBeCloseTo(-2.0, 2);
    });

    it('回傳格式包含 fromDate, toDate, oldWeight, newWeight, delta', () => {
        const snapshots: SnapshotDay[] = [
            makeDay('2026-06-01', [{ code: '2330', weight: 5.0, name: '台積電' }]),
            makeDay('2026-06-02', [{ code: '2330', weight: 6.5, name: '台積電' }]),
        ];
        const [item] = computeDailyDiff(snapshots);
        expect(item.fromDate).toBe('2026-06-01');
        expect(item.toDate).toBe('2026-06-02');
        expect(item.oldWeight).toBeCloseTo(5.0, 2);
        expect(item.newWeight).toBeCloseTo(6.5, 2);
        expect(item.delta).toBeCloseTo(1.5, 2);
        expect(item.name).toBe('台積電');
    });

    it('只比較相鄰日期對，不跨日比較', () => {
        // Day0→Day1 delta = 0.8（不納入）；Day1→Day2 delta = 1.5（納入）
        const snapshots: SnapshotDay[] = [
            makeDay('2026-06-01', [{ code: '2330', weight: 4.0 }]),
            makeDay('2026-06-02', [{ code: '2330', weight: 4.8 }]),
            makeDay('2026-06-03', [{ code: '2330', weight: 6.3 }]),
        ];
        const result = computeDailyDiff(snapshots);
        expect(result).toHaveLength(1);
        // 確認是 Day1→Day2 那組
        expect(result[0].fromDate).toBe('2026-06-02');
        expect(result[0].toDate).toBe('2026-06-03');
        // Day0→Day2（跨日）若被錯誤納入，delta 會是 2.3；此處不應出現
    });

    it('多股票同一日期對，各自獨立計算', () => {
        const snapshots: SnapshotDay[] = [
            makeDay('2026-06-01', [
                { code: '2330', weight: 5.0 },
                { code: '2317', weight: 3.0 },
            ]),
            makeDay('2026-06-02', [
                { code: '2330', weight: 6.5 },  // delta +1.5 → 納入
                { code: '2317', weight: 3.5 },  // delta +0.5 → 不納入
            ]),
        ];
        const result = computeDailyDiff(snapshots);
        expect(result).toHaveLength(1);
        expect(result[0].code).toBe('2330');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// computeCumulativeDiff
// ─────────────────────────────────────────────────────────────────────────────

describe('computeCumulativeDiff', () => {
    it('threshold boundary: today=10.00 past=7.00, |delta|=3.00 → 納入（>= 3.0）', () => {
        const snapshots: SnapshotDay[] = [
            makeDay('2026-06-01', [{ code: '2330', weight: 7.0, name: '台積電' }]),
            makeDay('2026-06-05', [{ code: '2330', weight: 10.0, name: '台積電' }]),
        ];
        const result = computeCumulativeDiff(snapshots);
        expect(result).toHaveLength(1);
        expect(result[0].code).toBe('2330');
        expect(result[0].entries[0].delta).toBeCloseTo(3.0, 2);
    });

    it('threshold boundary: today=10.00 past=7.01, |delta|=2.99 → 不納入（< 3.0）', () => {
        const snapshots: SnapshotDay[] = [
            makeDay('2026-06-01', [{ code: '2330', weight: 7.01 }]),
            makeDay('2026-06-05', [{ code: '2330', weight: 10.0 }]),
        ];
        const result = computeCumulativeDiff(snapshots);
        expect(result).toHaveLength(0);
    });

    it('threshold boundary: today=5.00 past=9.00, |delta|=4.00 負向 → 納入', () => {
        const snapshots: SnapshotDay[] = [
            makeDay('2026-06-01', [{ code: '2330', weight: 9.0, name: '台積電' }]),
            makeDay('2026-06-05', [{ code: '2330', weight: 5.0, name: '台積電' }]),
        ];
        const result = computeCumulativeDiff(snapshots);
        expect(result).toHaveLength(1);
        expect(result[0].entries[0].delta).toBeCloseTo(-4.0, 2);
    });

    it('同一股票多個歷史日的 entries 合併在同一個 item 下', () => {
        // 三天歷史 + 一天最新；同一股票跨多個歷史日均超過 threshold → 全部放在同一 item 的 entries
        const snapshots: SnapshotDay[] = [
            makeDay('2026-06-01', [{ code: '2330', weight: 5.0 }]),   // delta = 5.0 → 納入
            makeDay('2026-06-02', [{ code: '2330', weight: 6.0 }]),   // delta = 4.0 → 納入
            makeDay('2026-06-03', [{ code: '2330', weight: 7.5 }]),   // delta = 2.5 → 不納入
            makeDay('2026-06-05', [{ code: '2330', weight: 10.0 }]),  // 今日
        ];
        const result = computeCumulativeDiff(snapshots);
        expect(result).toHaveLength(1);
        expect(result[0].code).toBe('2330');
        expect(result[0].todayWeight).toBeCloseTo(10.0, 2);
        // 2026-06-01 delta=5.0 和 2026-06-02 delta=4.0 均超 threshold
        expect(result[0].entries).toHaveLength(2);
        const dates = result[0].entries.map(e => e.date).sort();
        expect(dates).toEqual(['2026-06-01', '2026-06-02']);
    });

    it('entries 包含正確的 pastWeight 與 delta', () => {
        const snapshots: SnapshotDay[] = [
            makeDay('2026-06-01', [{ code: '2454', weight: 3.0, name: '聯發科' }]),
            makeDay('2026-06-05', [{ code: '2454', weight: 7.0, name: '聯發科' }]),
        ];
        const result = computeCumulativeDiff(snapshots);
        expect(result[0].entries[0].pastWeight).toBeCloseTo(3.0, 2);
        expect(result[0].entries[0].delta).toBeCloseTo(4.0, 2);
        expect(result[0].entries[0].date).toBe('2026-06-01');
    });

    it('不同股票各自獨立分組', () => {
        const snapshots: SnapshotDay[] = [
            makeDay('2026-06-01', [
                { code: '2330', weight: 5.0 },   // delta = 5.0 → 納入
                { code: '2317', weight: 6.0 },   // delta = 4.0 → 納入
                { code: '2454', weight: 8.5 },   // delta = 1.0 → 不納入
            ]),
            makeDay('2026-06-05', [
                { code: '2330', weight: 10.0 },
                { code: '2317', weight: 10.0 },
                { code: '2454', weight: 9.5 },
            ]),
        ];
        const result = computeCumulativeDiff(snapshots);
        expect(result).toHaveLength(2);
        const codes = result.map(r => r.code).sort();
        expect(codes).toEqual(['2317', '2330']);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// insufficient data 防禦
// ─────────────────────────────────────────────────────────────────────────────

describe('insufficient data', () => {
    const singleDay: SnapshotDay[] = [
        makeDay('2026-06-05', [{ code: '2330', weight: 10.0 }]),
    ];

    it('computeDailyDiff([singleDay]) → 回傳空陣列', () => {
        const result = computeDailyDiff(singleDay);
        expect(result).toEqual([]);
    });

    it('computeCumulativeDiff([singleDay]) → 回傳空陣列', () => {
        const result = computeCumulativeDiff(singleDay);
        expect(result).toEqual([]);
    });

    it('computeDailyDiff([]) → 回傳空陣列', () => {
        expect(computeDailyDiff([])).toEqual([]);
    });

    it('computeCumulativeDiff([]) → 回傳空陣列', () => {
        expect(computeCumulativeDiff([])).toEqual([]);
    });
});
