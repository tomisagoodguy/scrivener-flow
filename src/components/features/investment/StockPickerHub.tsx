'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { ChevronUpIcon, ChevronDownIcon } from 'lucide-react';

// ── 型別定義 ────────────────────────────────────────────────────────────────

interface HoldingItem {
    stock_code: string;
    stock_name: string;
    weight: number;
    rank: number;
    in_etfs: string[];
}

interface EtfData {
    etf_code: string;
    name: string;
    color: string;
    holdings: HoldingItem[];
}

interface QuantFilter {
    momentum_60d: number | null;
    momentum_pass: boolean;
    it_buy_10d: number | null;
    it_buy_10d_pass: boolean;
    rev_ma3: number | null;
    rev_ma3_new_high: boolean;
    filter_score: number;
}

interface StockPickerHubProps {
    etfs: EtfData[];
    quantFilters: Record<string, QuantFilter>;
}

type SortField = 'shared_count' | 'filter_score' | 'momentum_60d' | 'it_buy_10d' | string;
type SortOrder = 'asc' | 'desc';

type FactorFilter = 'momentum' | 'it_buy' | 'rev_new_high' | 'all_shared';

const ETF_CODES = ['00981A', '00980A', '00991A'] as const;

// ── 子元件 ─────────────────────────────────────────────────────────────────────

interface TableSortIconProps {
    field: SortField;
    currentSortField: SortField;
    currentSortOrder: SortOrder;
}

const TableSortIcon = ({ field, currentSortField, currentSortOrder }: TableSortIconProps) => {
    if (currentSortField !== field) return <span className="text-slate-300 ml-1">↕</span>;
    return currentSortOrder === 'desc'
        ? <ChevronDownIcon className="w-3 h-3 inline ml-1" />
        : <ChevronUpIcon className="w-3 h-3 inline ml-1" />;
};

// ── 合併持股列表 ─────────────────────────────────────────────────────────────

interface UnifiedHolding {
    stock_code: string;
    stock_name: string;
    shared_count: number;
    weights: Record<string, number>;  // etf_code -> weight
    filter_score: number;
    momentum_60d: number | null;
    it_buy_10d: number | null;
    momentum_pass: boolean;
    it_buy_10d_pass: boolean;
    rev_ma3_new_high: boolean;
}

function buildUnifiedHoldings(
    etfs: EtfData[],
    selectedEtfs: Set<string>,
    quantFilters: Record<string, QuantFilter>
): UnifiedHolding[] {
    const stockMap = new Map<string, UnifiedHolding>();

    for (const etf of etfs) {
        if (!selectedEtfs.has(etf.etf_code)) continue;
        for (const h of etf.holdings) {
            if (!stockMap.has(h.stock_code)) {
                const q = quantFilters[h.stock_code];
                stockMap.set(h.stock_code, {
                    stock_code: h.stock_code,
                    stock_name: h.stock_name,
                    shared_count: 0,
                    weights: {},
                    filter_score: q?.filter_score ?? 0,
                    momentum_60d: q?.momentum_60d ?? null,
                    it_buy_10d: q?.it_buy_10d ?? null,
                    momentum_pass: q?.momentum_pass ?? false,
                    it_buy_10d_pass: q?.it_buy_10d_pass ?? false,
                    rev_ma3_new_high: q?.rev_ma3_new_high ?? false,
                });
            }
            const entry = stockMap.get(h.stock_code)!;
            entry.weights[etf.etf_code] = h.weight;
        }
    }

    // 計算 shared_count（只計算已選取的 ETF）
    for (const entry of stockMap.values()) {
        entry.shared_count = Object.keys(entry.weights).filter(e => selectedEtfs.has(e)).length;
    }

    return Array.from(stockMap.values());
}

// ── 排序 helper ──────────────────────────────────────────────────────────────

function sortHoldings(
    holdings: UnifiedHolding[],
    field: SortField,
    order: SortOrder
): UnifiedHolding[] {
    return [...holdings].sort((a, b) => {
        let aVal: number;
        let bVal: number;

        if (field.startsWith('weight_')) {
            const etfCode = field.replace('weight_', '');
            aVal = a.weights[etfCode] ?? -Infinity;
            bVal = b.weights[etfCode] ?? -Infinity;
        } else if (field === 'shared_count') {
            aVal = a.shared_count;
            bVal = b.shared_count;
        } else if (field === 'filter_score') {
            aVal = a.filter_score;
            bVal = b.filter_score;
        } else if (field === 'momentum_60d') {
            aVal = a.momentum_60d ?? -Infinity;
            bVal = b.momentum_60d ?? -Infinity;
        } else if (field === 'it_buy_10d') {
            aVal = a.it_buy_10d ?? -Infinity;
            bVal = b.it_buy_10d ?? -Infinity;
        } else {
            aVal = a.filter_score;
            bVal = b.filter_score;
        }

        return order === 'desc' ? bVal - aVal : aVal - bVal;
    });
}

// ── 主元件 ─────────────────────────────────────────────────────────────────────

export function StockPickerHub({ etfs, quantFilters }: StockPickerHubProps) {
    const [selectedEtfs, setSelectedEtfs] = useState<Set<string>>(
        new Set(ETF_CODES)
    );
    const [activeFactors, setActiveFactors] = useState<Set<FactorFilter>>(new Set());
    const [sortField, setSortField] = useState<SortField>('filter_score');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

    const etfColorMap = useMemo(() => {
        const map: Record<string, string> = {};
        for (const etf of etfs) map[etf.etf_code] = etf.color;
        return map;
    }, [etfs]);

    const unifiedHoldings = useMemo(() =>
        buildUnifiedHoldings(etfs, selectedEtfs, quantFilters),
        [etfs, selectedEtfs, quantFilters]
    );

    const filteredHoldings = useMemo(() => {
        if (activeFactors.size === 0) return unifiedHoldings;
        return unifiedHoldings.filter(h => {
            if (activeFactors.has('momentum') && !h.momentum_pass) return false;
            if (activeFactors.has('it_buy') && !h.it_buy_10d_pass) return false;
            if (activeFactors.has('rev_new_high') && !h.rev_ma3_new_high) return false;
            if (activeFactors.has('all_shared') && h.shared_count < selectedEtfs.size) return false;
            return true;
        });
    }, [unifiedHoldings, activeFactors, selectedEtfs.size]);

    const sortedHoldings = useMemo(() =>
        sortHoldings(filteredHoldings, sortField, sortOrder),
        [filteredHoldings, sortField, sortOrder]
    );

    const toggleFactor = (factor: FactorFilter) => {
        setActiveFactors(prev => {
            const next = new Set(prev);
            if (next.has(factor)) next.delete(factor);
            else next.add(factor);
            return next;
        });
    };

    const toggleEtf = (code: string) => {
        setSelectedEtfs(prev => {
            const next = new Set(prev);
            if (next.has(code)) {
                if (next.size === 1) return prev; // 至少保留一個
                next.delete(code);
            } else {
                next.add(code);
            }
            return next;
        });
    };

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(o => o === 'desc' ? 'asc' : 'desc');
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
    };

    const activeEtfCodes = ETF_CODES.filter(c => selectedEtfs.has(c));

    return (
        <div className="glass-card rounded-2xl p-6 space-y-4">
            {/* ETF 篩選勾選框 */}
            <div className="flex items-center gap-4 flex-wrap">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">篩選 ETF：</span>
                {etfs.map(etf => (
                    <label key={etf.etf_code} className="flex items-center gap-1.5 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={selectedEtfs.has(etf.etf_code)}
                            onChange={() => toggleEtf(etf.etf_code)}
                            className="w-4 h-4 rounded"
                            style={{ accentColor: etf.color }}
                        />
                        <span
                            className="text-sm font-medium px-2 py-0.5 rounded-full"
                            style={{
                                backgroundColor: etf.color + '20',
                                color: etf.color,
                                border: `1px solid ${etf.color}60`,
                            }}
                        >
                            {etf.etf_code}
                        </span>
                    </label>
                ))}
                <span className="text-xs text-slate-400 ml-auto">
                    共 {sortedHoldings.length} 支個股
                </span>
            </div>

            {/* 強勢因子篩選（AND Logic） */}
            <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-100 dark:border-slate-800">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400 shrink-0">強勢因子：</span>
                {(
                    [
                        { key: 'momentum', label: '動能正', color: 'emerald' },
                        { key: 'it_buy', label: '投信買超', color: 'blue' },
                        { key: 'rev_new_high', label: '營收新高', color: 'violet' },
                        { key: 'all_shared', label: `${selectedEtfs.size}方共持`, color: 'amber' },
                    ] as const
                ).map(({ key, label, color }) => {
                    const active = activeFactors.has(key);
                    const colorMap: Record<string, { active: string; inactive: string }> = {
                        emerald: {
                            active: 'bg-emerald-100 text-emerald-700 border-emerald-400 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-600',
                            inactive: 'bg-white/60 text-slate-500 border-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700',
                        },
                        blue: {
                            active: 'bg-blue-100 text-blue-700 border-blue-400 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-600',
                            inactive: 'bg-white/60 text-slate-500 border-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700',
                        },
                        violet: {
                            active: 'bg-violet-100 text-violet-700 border-violet-400 dark:bg-violet-900/50 dark:text-violet-300 dark:border-violet-600',
                            inactive: 'bg-white/60 text-slate-500 border-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700',
                        },
                        amber: {
                            active: 'bg-amber-100 text-amber-700 border-amber-400 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-600',
                            inactive: 'bg-white/60 text-slate-500 border-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700',
                        },
                    };
                    return (
                        <button
                            key={key}
                            onClick={() => toggleFactor(key)}
                            className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-all select-none cursor-pointer ${
                                active ? colorMap[color].active : colorMap[color].inactive
                            }`}
                        >
                            {active && <span className="mr-1">✓</span>}
                            {label}
                        </button>
                    );
                })}
                {activeFactors.size > 0 && (
                    <button
                        onClick={() => setActiveFactors(new Set())}
                        className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline ml-1"
                    >
                        清除
                    </button>
                )}
            </div>

            {/* 持股表格 */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
                            <th className="text-left py-2 px-2 font-medium">股票</th>
                            <th
                                className="text-center py-2 px-2 font-medium cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 whitespace-nowrap"
                                onClick={() => handleSort('shared_count')}
                            >
                                共持 <TableSortIcon field="shared_count" currentSortField={sortField} currentSortOrder={sortOrder} />
                            </th>
                            <th
                                className="text-center py-2 px-2 font-medium cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 whitespace-nowrap"
                                onClick={() => handleSort('filter_score')}
                            >
                                動能分 <TableSortIcon field="filter_score" currentSortField={sortField} currentSortOrder={sortOrder} />
                            </th>
                            <th
                                className="text-center py-2 px-2 font-medium cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 whitespace-nowrap"
                                onClick={() => handleSort('momentum_60d')}
                            >
                                60日動能% <TableSortIcon field="momentum_60d" currentSortField={sortField} currentSortOrder={sortOrder} />
                            </th>
                            <th
                                className="text-center py-2 px-2 font-medium cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 whitespace-nowrap"
                                onClick={() => handleSort('it_buy_10d')}
                            >
                                投信10日 <TableSortIcon field="it_buy_10d" currentSortField={sortField} currentSortOrder={sortOrder} />
                            </th>
                            {activeEtfCodes.map(code => (
                                <th
                                    key={code}
                                    className="text-center py-2 px-2 font-medium cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 whitespace-nowrap"
                                    onClick={() => handleSort(`weight_${code}`)}
                                    style={{ color: etfColorMap[code] }}
                                >
                                    {code} <TableSortIcon field={`weight_${code}`} currentSortField={sortField} currentSortOrder={sortOrder} />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedHoldings.map((h) => {
                            const isTriple = h.shared_count >= 3;
                            const isDouble = h.shared_count === 2;

                            return (
                                <tr
                                    key={h.stock_code}
                                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                >
                                    <td className="py-2 px-2">
                                        <div className="flex items-center gap-2">
                                            <Link
                                                href={`/investment/stock/${h.stock_code}`}
                                                className="font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                                            >
                                                {h.stock_code}
                                            </Link>
                                            <span className="text-slate-600 dark:text-slate-400 text-xs truncate max-w-[80px]">
                                                {h.stock_name}
                                            </span>
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
                                        </div>
                                    </td>
                                    <td className="py-2 px-2 text-center">
                                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                                            {h.shared_count}/{selectedEtfs.size}
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
                                            <span className={`text-xs font-medium ${h.momentum_pass ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                                                {h.momentum_60d > 0 ? '+' : ''}{h.momentum_60d.toFixed(1)}%
                                            </span>
                                        ) : (
                                            <span className="text-slate-300 dark:text-slate-600">—</span>
                                        )}
                                    </td>
                                    <td className="py-2 px-2 text-center">
                                        {h.it_buy_10d !== null ? (
                                            <span className={`text-xs font-medium ${h.it_buy_10d_pass ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                                                {h.it_buy_10d > 0 ? '+' : ''}{(h.it_buy_10d / 1000).toFixed(0)}K
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
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
