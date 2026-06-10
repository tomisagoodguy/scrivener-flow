export interface SnapshotHolding {
    stock_code: string;
    stock_name: string | null;
    weight: number | null;
    rank: number | null;
}

export interface SnapshotDay {
    date: string;
    holdings: SnapshotHolding[];
}

export interface DailyDiffItem {
    code: string;
    name: string;
    fromDate: string;
    toDate: string;
    oldWeight: number;
    newWeight: number;
    delta: number;
}

export interface CumulativeDiffEntry {
    date: string;
    pastWeight: number;
    delta: number;
}

export interface CumulativeDiffItem {
    code: string;
    name: string;
    todayWeight: number;
    todayRank: number | null;
    entries: CumulativeDiffEntry[];
}

export interface Holdings5DayTrendResult {
    insufficient: boolean;
    dailyDiff: DailyDiffItem[];
    cumulativeDiff: CumulativeDiffItem[];
    dates: string[];
}

const DAILY_THRESHOLD = 1.0;
const CUMULATIVE_THRESHOLD = 3.0;

export function computeDailyDiff(snapshots: SnapshotDay[]): DailyDiffItem[] {
    const items: DailyDiffItem[] = [];
    for (let i = 0; i < snapshots.length - 1; i++) {
        const from = snapshots[i];
        const to = snapshots[i + 1];
        const fromMap = new Map(from.holdings.map(h => [h.stock_code, h]));
        for (const toHolding of to.holdings) {
            const fromHolding = fromMap.get(toHolding.stock_code);
            if (!fromHolding || fromHolding.weight == null || toHolding.weight == null) continue;
            const delta = toHolding.weight - fromHolding.weight;
            if (Math.abs(delta) < DAILY_THRESHOLD) continue;
            items.push({
                code: toHolding.stock_code,
                name: toHolding.stock_name ?? fromHolding.stock_name ?? toHolding.stock_code,
                fromDate: from.date,
                toDate: to.date,
                oldWeight: fromHolding.weight,
                newWeight: toHolding.weight,
                delta,
            });
        }
    }
    items.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    return items;
}

export function computeCumulativeDiff(snapshots: SnapshotDay[]): CumulativeDiffItem[] {
    if (snapshots.length < 2) return [];
    const today = snapshots[snapshots.length - 1];
    const past = snapshots.slice(0, snapshots.length - 1);
    const todayMap = new Map(today.holdings.map(h => [h.stock_code, h]));

    const byCode = new Map<string, CumulativeDiffItem>();
    for (const day of past) {
        for (const pastHolding of day.holdings) {
            const todayHolding = todayMap.get(pastHolding.stock_code);
            if (!todayHolding || todayHolding.weight == null || pastHolding.weight == null) continue;
            const delta = todayHolding.weight - pastHolding.weight;
            if (Math.abs(delta) < CUMULATIVE_THRESHOLD) continue;
            if (!byCode.has(pastHolding.stock_code)) {
                byCode.set(pastHolding.stock_code, {
                    code: pastHolding.stock_code,
                    name: todayHolding.stock_name ?? pastHolding.stock_name ?? pastHolding.stock_code,
                    todayWeight: todayHolding.weight,
                    todayRank: todayHolding.rank,
                    entries: [],
                });
            }
            byCode.get(pastHolding.stock_code)!.entries.push({ date: day.date, pastWeight: pastHolding.weight, delta });
        }
    }
    const items = Array.from(byCode.values());
    items.sort((a, b) => Math.max(...b.entries.map(e => Math.abs(e.delta))) - Math.max(...a.entries.map(e => Math.abs(e.delta))));
    return items;
}
