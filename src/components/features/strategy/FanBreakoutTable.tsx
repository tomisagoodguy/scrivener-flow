'use client';

import { FAN_BREAKOUT_SIGNAL_LABEL as SIGNAL_LABEL, type FanBreakoutRow } from '@/lib/investment/fanBreakout';

interface Props {
    items: FanBreakoutRow[];
    /** items[0] 在篩選後清單中的索引 */
    startIndex: number;
    selectedIndex: number;
    onSelect: (index: number) => void;
}

const DASH = '—';
const HEADERS = ['日期', '代號', '名稱', '類型', '連續天數', 'spread', '市場', '訊號後報酬', '期間最高', '期間最低'];

function fmtPrice(v: number | null): string {
    return v === null ? DASH : v.toFixed(2);
}

function fmtPct(v: number | null): string {
    return v === null ? DASH : `${(v * 100).toFixed(2)}%`;
}

function ReturnCell({ value }: { value: number | null }) {
    if (value === null) return <span>{DASH}</span>;
    const cls =
        value > 0
            ? 'text-rose-600 dark:text-rose-400'
            : value < 0
              ? 'text-emerald-600 dark:text-emerald-400'
              : '';
    return <span className={cls}>{`${value > 0 ? '+' : ''}${(value * 100).toFixed(2)}%`}</span>;
}

export default function FanBreakoutTable({ items, startIndex, selectedIndex, onSelect }: Props) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200/60 dark:border-gray-700">
                        {HEADERS.map((h) => (
                            <th key={h} className="px-2 py-2 font-medium whitespace-nowrap">
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {items.map((row, i) => {
                        const index = startIndex + i;
                        const selected = index === selectedIndex;
                        return (
                            <tr
                                key={`${row.date}-${row.stockId}`}
                                aria-selected={selected}
                                onClick={() => onSelect(index)}
                                className={`cursor-pointer border-b border-gray-100/60 dark:border-gray-800 hover:bg-gray-100/60 dark:hover:bg-gray-700/40 ${
                                    selected ? 'bg-indigo-500/10' : ''
                                }`}
                            >
                                <td className="px-2 py-1.5 whitespace-nowrap">{row.date}</td>
                                <td className="px-2 py-1.5 font-mono">{row.stockId}</td>
                                <td className="px-2 py-1.5 whitespace-nowrap">{row.name}</td>
                                <td className="px-2 py-1.5">{row.signalType ? SIGNAL_LABEL[row.signalType] : DASH}</td>
                                <td className="px-2 py-1.5">{row.consecDays ?? DASH}</td>
                                <td className="px-2 py-1.5">{fmtPct(row.spread)}</td>
                                <td className="px-2 py-1.5">{row.market ?? DASH}</td>
                                <td className="px-2 py-1.5">
                                    <ReturnCell value={row.returnSinceSignal} />
                                </td>
                                <td className="px-2 py-1.5">{fmtPrice(row.highSinceSignal)}</td>
                                <td className="px-2 py-1.5">{fmtPrice(row.lowSinceSignal)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
