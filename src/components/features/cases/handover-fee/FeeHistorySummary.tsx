import { summarizeHistory } from '@/domain/handover-fee/historySummary';
import type { LedgerEntry } from '@/domain/handover-fee/types';
import { formatAmount } from './useFeeRowActions';

/** 歷史清單的統計列：只算目前列出的紀錄，兩類分開、省略沒有紀錄的類型 */
export function FeeHistorySummary({ entries }: { entries: LedgerEntry[] }) {
    if (entries.length === 0) return null;
    const { solo, exchange } = summarizeHistory(entries);

    return (
        <p data-testid="history-summary" className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-black text-slate-600 dark:text-slate-300">
            {solo.cases > 0 && <span>{`自己遞牌 ${solo.cases} 件 · ${formatAmount(solo.amount)}`}</span>}
            {exchange.records > 0 && <span>{`互遞 ${exchange.records} 筆 · ${formatAmount(exchange.amount)}`}</span>}
        </p>
    );
}
