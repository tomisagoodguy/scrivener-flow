import type { LedgerEntry } from './types';

export interface HistorySummary {
    solo: { cases: number; amount: number };
    exchange: { records: number; amount: number };
}

/** 兩類分開加總：互遞含付給別人的錢，相加就不是收入；未填金額的自己遞牌只計件數 */
export function summarizeHistory(entries: LedgerEntry[]): HistorySummary {
    const summary: HistorySummary = {
        solo: { cases: 0, amount: 0 },
        exchange: { records: 0, amount: 0 },
    };
    for (const entry of entries) {
        if (entry.entry_type === 'solo') {
            summary.solo.cases += entry.case_count;
            summary.solo.amount += entry.amount ?? 0;
        } else {
            summary.exchange.records += 1;
            summary.exchange.amount += entry.amount;
        }
    }
    return summary;
}
