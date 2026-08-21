'use client';

import { useMemo, useState } from 'react';
import type { EtfData, OverlapData } from './EtfComparePanel';
import {
    buildStockOverlapRows,
    sortStockOverlapRows,
    truncateList,
    type StockOverlapSortField,
} from './EtfComparePanelUtils';

interface SortState {
    field: StockOverlapSortField;
    direction: 'asc' | 'desc';
}

const COLUMNS: { field: StockOverlapSortField; label: string; format: (v: number) => string }[] = [
    { field: 'held_count', label: '持有家數', format: (v) => `${v}` },
    { field: 'coverage_pct', label: '覆蓋率', format: (v) => `${v.toFixed(0)}%` },
    { field: 'avg_weight', label: '平均權重', format: (v) => `${v.toFixed(2)}%` },
    { field: 'total_weight', label: '合計權重', format: (v) => `${v.toFixed(2)}%` },
];

export function EtfOverlapStockTable({ etfs, overlap }: { etfs: EtfData[]; overlap: OverlapData }) {
    const [sort, setSort] = useState<SortState>({ field: 'held_count', direction: 'desc' });

    const colorMap = useMemo(() => {
        const map = new Map<string, string>();
        etfs.forEach(e => map.set(e.etf_code, e.color));
        return map;
    }, [etfs]);

    const rows = useMemo(() => {
        const base = buildStockOverlapRows(etfs, overlap.totalEtfs);
        return sortStockOverlapRows(base, sort.field, sort.direction);
    }, [etfs, overlap.totalEtfs, sort]);

    if (etfs.length === 0) {
        return (
            <div className="glass-card rounded-xl px-4 py-3 text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />尚無持股資料
            </div>
        );
    }

    const handleSort = (field: StockOverlapSortField) => {
        setSort(prev => prev.field === field
            ? { field, direction: prev.direction === 'desc' ? 'asc' : 'desc' }
            : { field, direction: 'desc' });
    };

    return (
        <div className="glass-card rounded-2xl overflow-hidden">
            <div className="overflow-auto max-h-[70vh]">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/90 backdrop-blur text-xs text-slate-500 dark:text-slate-400 z-10">
                        <tr>
                            <th className="px-3 py-2 text-left">代號</th>
                            <th className="px-3 py-2 text-left">名稱</th>
                            {COLUMNS.map(col => (
                                <th key={col.field} className="px-3 py-2 text-right">
                                    <button
                                        onClick={() => handleSort(col.field)}
                                        className="inline-flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                                    >
                                        {col.label}
                                        {sort.field === col.field && <span>{sort.direction === 'desc' ? '▼' : '▲'}</span>}
                                    </button>
                                </th>
                            ))}
                            <th className="px-3 py-2 text-left">持有清單</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(row => {
                            const { shown, remaining } = truncateList(row.held_by, 5);
                            return (
                                <tr key={row.stock_code} className="border-t border-slate-100 dark:border-slate-700/50">
                                    <td className="px-3 py-2 font-mono text-xs">
                                        <a href={`https://finance.yahoo.com/quote/${row.stock_code}.TW`} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                                            {row.stock_code}
                                        </a>
                                    </td>
                                    <td className="px-3 py-2 text-slate-800 dark:text-slate-200">{row.stock_name}</td>
                                    <td className="px-3 py-2 text-right font-medium text-slate-700 dark:text-slate-300">{row.held_count}</td>
                                    <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-300">{row.coverage_pct.toFixed(0)}%</td>
                                    <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-300">{row.avg_weight.toFixed(2)}%</td>
                                    <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-300">{row.total_weight.toFixed(2)}%</td>
                                    <td className="px-3 py-2">
                                        <div className="flex flex-wrap gap-1">
                                            {shown.map(code => (
                                                <span
                                                    key={code}
                                                    style={{ backgroundColor: `${colorMap.get(code) ?? '#888888'}1a`, color: colorMap.get(code) ?? '#888888' }}
                                                    className="text-xs font-medium px-1.5 py-0.5 rounded-full"
                                                >
                                                    {code}
                                                </span>
                                            ))}
                                            {remaining > 0 && (
                                                <span className="text-xs text-slate-400 dark:text-slate-500 px-1.5 py-0.5">+{remaining} 支</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
