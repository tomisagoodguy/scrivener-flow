'use client';

import Link from 'next/link';
import { ChevronUpIcon, ChevronDownIcon } from 'lucide-react';
import { SignalBadge } from './SignalBadge';
import type { UnifiedHolding, SortField, SortOrder } from './StockPickerHub.types';
import { HOLDING_SORT_FIELDS } from './StockPickerHub.types';

interface HoldingsTableRowProps {
    holding: UnifiedHolding;
    activeEtfCodes: string[];
    etfColorMap: Record<string, string>;
    selectedEtfsSize: number;
    sortField: SortField;
    sortOrder: SortOrder;
    signals: Record<string, { strength: 1 | 2 | 3; type: string }>;
    onOpenPanel: (code: string, name: string) => void;
}

function SortIcon({ field, currentSortField, currentSortOrder }: {
    field: SortField;
    currentSortField: SortField;
    currentSortOrder: SortOrder;
}) {
    if (currentSortField !== field) return <span className="text-slate-300 ml-1">↕</span>;
    return currentSortOrder === 'desc'
        ? <ChevronDownIcon className="w-3 h-3 inline ml-1" />
        : <ChevronUpIcon className="w-3 h-3 inline ml-1" />;
}

function toStockLink(code: string, sortField: SortField, sortOrder: SortOrder): string {
    if (HOLDING_SORT_FIELDS.has(sortField)) {
        return `/investment/stock/${code}?sort=${sortField}&order=${sortOrder}`;
    }
    return `/investment/stock/${code}`;
}

export function HoldingsTableRow({
    holding: h,
    activeEtfCodes,
    etfColorMap,
    selectedEtfsSize,
    sortField,
    sortOrder,
    signals,
    onOpenPanel,
}: HoldingsTableRowProps) {
    const isTriple = h.shared_count >= 3;
    const isDouble = h.shared_count === 2;
    const holdingEtfs = activeEtfCodes.filter(c => h.weights[c] !== undefined);

    return (
        <tr className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            <td className="py-2 px-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <Link
                        href={toStockLink(h.stock_code, sortField, sortOrder)}
                        className="font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                        {h.stock_code}
                    </Link>
                    <button
                        onClick={() => onOpenPanel(h.stock_code, h.stock_name)}
                        className="text-slate-600 dark:text-slate-400 text-xs truncate max-w-[80px] hover:text-indigo-500 transition-colors text-left"
                        title="查看詳情"
                    >
                        {h.stock_name}
                    </button>
                    {holdingEtfs.slice(0, 2).map(code => {
                        const color = etfColorMap[code] ?? '#888';
                        return (
                            <span
                                key={code}
                                className="text-[10px] px-1 py-0.5 rounded font-mono whitespace-nowrap"
                                style={{ backgroundColor: color + '20', color, border: `1px solid ${color}50` }}
                            >
                                {code.replace(/[A-Z]$/, '')}
                            </span>
                        );
                    })}
                    {holdingEtfs.length > 2 && (
                        <span className="text-[10px] px-1 py-0.5 rounded font-mono whitespace-nowrap bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                            +{holdingEtfs.length - 2}
                        </span>
                    )}
                    {h.industry && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 font-normal whitespace-nowrap">
                            {h.industry}
                        </span>
                    )}
                    {isTriple && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700 font-medium">
                            3共
                        </span>
                    )}
                    {isDouble && !isTriple && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700 font-medium">
                            2共
                        </span>
                    )}
                    {h.is_high_200d && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700 font-medium">
                            高200
                        </span>
                    )}
                    {h.is_high_20d && !h.is_high_200d && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-lime-100 text-lime-700 border border-lime-300 dark:bg-lime-900/40 dark:text-lime-300 dark:border-lime-700 font-medium">
                            高20
                        </span>
                    )}
                    {signals[h.stock_code] && (
                        <SignalBadge
                            strength={signals[h.stock_code].strength}
                            type={signals[h.stock_code].type}
                            compact
                        />
                    )}
                </div>
            </td>
            <td className="py-2 px-2 text-center">
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                    {h.shared_count}/{selectedEtfsSize}
                </span>
            </td>
            <td className="py-2 px-2 text-center">
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                    h.filter_score === 3
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                        : h.filter_score === 2
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                        : h.filter_score === 1
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                        : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                }`}>
                    {h.filter_score}
                </span>
            </td>
            <td className="py-2 px-2 text-center">
                {h.momentum_60d !== null ? (
                    <span className={`text-xs font-medium ${h.momentum_pass ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        {h.momentum_60d > 0 ? '+' : ''}{h.momentum_60d.toFixed(1)}%
                    </span>
                ) : (
                    <span className="text-slate-300 dark:text-slate-600">—</span>
                )}
            </td>
            <td className="py-2 px-2 text-center">
                {h.it_buy_5d !== null ? (
                    <span className={`text-xs font-medium ${h.it_buy_5d_pass ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        {h.it_buy_5d > 0 ? '+' : ''}{(h.it_buy_5d / 1000).toFixed(0)}K
                    </span>
                ) : (
                    <span className="text-slate-300 dark:text-slate-600">—</span>
                )}
            </td>
            <td className="py-2 px-2 text-center">
                {h.revenue_yoy !== null ? (
                    <span className={`text-xs font-medium ${
                        h.revenue_yoy >= 50
                            ? 'text-red-600 dark:text-red-400'
                            : h.revenue_yoy < 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-slate-600 dark:text-slate-300'
                    }`}>
                        {h.revenue_yoy > 0 ? '+' : ''}{h.revenue_yoy.toFixed(1)}%
                    </span>
                ) : (
                    <span className="text-slate-300 dark:text-slate-600">—</span>
                )}
            </td>
            <td className="py-2 px-2 text-center">
                {h.amount != null ? (
                    <span className={`text-xs font-medium ${(h.amountRank ?? Infinity) <= 10 ? 'text-cyan-600 dark:text-cyan-400 font-bold' : 'text-slate-600 dark:text-slate-300'}`}>
                        {h.amount >= 1e8
                            ? `${(h.amount / 1e8).toFixed(1)}億`
                            : `${(h.amount / 1e4).toFixed(0)}萬`}
                    </span>
                ) : (
                    <span className="text-slate-300 dark:text-slate-600">—</span>
                )}
            </td>
            <td className="py-2 px-2 text-center">
                {h.margin_ratio != null ? (
                    <span className={`text-xs font-medium ${
                        (h.marginRankHigh ?? Infinity) <= 10
                            ? 'text-purple-600 dark:text-purple-400 font-bold'
                            : (h.marginRankLow ?? Infinity) <= 10
                            ? 'text-pink-600 dark:text-pink-400 font-bold'
                            : 'text-slate-600 dark:text-slate-300'
                    }`}>
                        {h.margin_ratio.toFixed(1)}%
                    </span>
                ) : (
                    <span className="text-slate-300 dark:text-slate-600">—</span>
                )}
            </td>
            <td className="py-2 px-2 text-center">
                {(h.fund_consec_days ?? 0) > 0 ? (
                    <span className={`text-xs font-medium ${(h.fund_consec_days ?? 0) >= 3 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300'}`}>
                        {h.fund_consec_days}d
                    </span>
                ) : (
                    <span className="text-slate-300 dark:text-slate-600">—</span>
                )}
            </td>
            <td className="py-2 px-2 text-center">
                {(h.consensus_count ?? 0) > 0 ? (
                    <span className={`text-xs font-bold ${
                        h.consensus_count === 3
                            ? 'text-amber-600 dark:text-amber-400'
                            : h.consensus_count === 2
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-slate-500 dark:text-slate-400'
                    }`}>
                        {'★'.repeat(h.consensus_count ?? 0)}{'☆'.repeat(3 - (h.consensus_count ?? 0))}
                    </span>
                ) : (
                    <span className="text-slate-300 dark:text-slate-600">—</span>
                )}
            </td>
            {activeEtfCodes.map(code => (
                <td key={code} className="py-2 px-2 text-center">
                    {h.weights[code] !== undefined ? (
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            {h.weights[code].toFixed(2)}%
                        </span>
                    ) : (
                        <span className="text-slate-300 dark:text-slate-600">—</span>
                    )}
                </td>
            ))}
        </tr>
    );
}

// Re-export SortIcon for HoldingsTable to use
export { SortIcon };
