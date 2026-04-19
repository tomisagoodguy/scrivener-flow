'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ChevronUpIcon, ChevronDownIcon } from 'lucide-react';

// ── 型別定義 ────────────────────────────────────────────────────────────────

interface HoldingItem {
    stock_code: string;
    stock_name: string;
    weight: number;
    rank: number;
    in_etfs: string[];
    revenue_yoy?: number | null;
    amount?: number | null;
    margin_ratio?: number | null;
    is_high_5d?: boolean | null;
    is_high_20d?: boolean | null;
    is_high_200d?: boolean | null;
    volatility?: number | null;
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
    it_buy_5d: number | null;
    it_buy_5d_pass: boolean;
    rev_ma3: number | null;
    rev_ma3_new_high: boolean;
    filter_score: number;
}

interface StockPickerHubProps {
    etfs: EtfData[];
    quantFilters: Record<string, QuantFilter>;
}

type SortField = 'shared_count' | 'filter_score' | 'momentum_60d' | 'it_buy_5d' | string;

// SortField 值可直接對應 Holding 欄位的清單（用於傳遞 URL query params）
const HOLDING_SORT_FIELDS = new Set(['filter_score', 'momentum_60d', 'it_buy_5d', 'revenue_yoy', 'amount', 'margin_ratio', 'volatility']);

function toStockLink(code: string, sortField: SortField, sortOrder: SortOrder): string {
    if (HOLDING_SORT_FIELDS.has(sortField)) {
        return `/investment/stock/${code}?sort=${sortField}&order=${sortOrder}`;
    }
    return `/investment/stock/${code}`;
}
type SortOrder = 'asc' | 'desc';

type FactorFilter =
    | 'new_high' | 'high_20d' | 'high_200d'
    | 'weight_top10' | 'amount_top10' | 'yoy_20' | 'low_vol' | 'margin_high10' | 'margin_low10'
    | 'momentum' | 'it_buy' | 'rev_new_high' | 'all_shared' | 'golden_zone' | 'explosive_zone';

import { ETF_REGISTRY } from '@/lib/investment/etfRegistry';
const ETF_CODES = ETF_REGISTRY.map(e => e.code);

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
    maxWeight: number;
    filter_score: number;
    momentum_60d: number | null;
    it_buy_5d: number | null;
    momentum_pass: boolean;
    it_buy_5d_pass: boolean;
    rev_ma3_new_high: boolean;
    revenue_yoy: number | null;
    amount: number | null;
    margin_ratio: number | null;
    is_high_5d: boolean;
    is_high_20d: boolean;
    is_high_200d: boolean;
    volatility: number | null;
    weightRank?: number;
    amountRank?: number;
    marginRankHigh?: number;
    marginRankLow?: number;
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
                    maxWeight: 0,
                    filter_score: q?.filter_score ?? 0,
                    momentum_60d: q?.momentum_60d ?? null,
                    it_buy_5d: q?.it_buy_5d ?? null,
                    momentum_pass: q?.momentum_pass ?? false,
                    it_buy_5d_pass: q?.it_buy_5d_pass ?? false,
                    rev_ma3_new_high: q?.rev_ma3_new_high ?? false,
                    revenue_yoy: h.revenue_yoy ?? null,
                    amount: h.amount ?? null,
                    margin_ratio: h.margin_ratio ?? null,
                    is_high_5d: h.is_high_5d ?? false,
                    is_high_20d: h.is_high_20d ?? false,
                    is_high_200d: h.is_high_200d ?? false,
                    volatility: h.volatility ?? null,
                });
            }
            const entry = stockMap.get(h.stock_code)!;
            entry.weights[etf.etf_code] = h.weight;
            if (h.amount != null && entry.amount == null) entry.amount = h.amount;
            if (h.margin_ratio != null && entry.margin_ratio == null) entry.margin_ratio = h.margin_ratio;
            if (h.is_high_5d) entry.is_high_5d = true;
            if (h.is_high_20d) entry.is_high_20d = true;
            if (h.is_high_200d) entry.is_high_200d = true;
            if (h.volatility != null && entry.volatility == null) entry.volatility = h.volatility;
        }
    }

    const result = Array.from(stockMap.values());

    // shared_count & maxWeight
    for (const entry of result) {
        entry.shared_count = Object.keys(entry.weights).filter(e => selectedEtfs.has(e)).length;
        entry.maxWeight = Math.max(...Object.values(entry.weights));
    }

    // Compute cross-pool ranks
    const byWeight = [...result].sort((a, b) => b.maxWeight - a.maxWeight);
    byWeight.forEach((h, i) => { stockMap.get(h.stock_code)!.weightRank = i + 1; });

    const byAmount = [...result].sort((a, b) => (b.amount ?? -Infinity) - (a.amount ?? -Infinity));
    byAmount.forEach((h, i) => { if (h.amount != null) stockMap.get(h.stock_code)!.amountRank = i + 1; });

    const byMarginHigh = [...result].sort((a, b) => (b.margin_ratio ?? -Infinity) - (a.margin_ratio ?? -Infinity));
    byMarginHigh.forEach((h, i) => { if (h.margin_ratio != null) stockMap.get(h.stock_code)!.marginRankHigh = i + 1; });

    const byMarginLow = [...result].sort((a, b) => (a.margin_ratio ?? Infinity) - (b.margin_ratio ?? Infinity));
    byMarginLow.forEach((h, i) => { if (h.margin_ratio != null) stockMap.get(h.stock_code)!.marginRankLow = i + 1; });

    return result;
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
        } else if (field === 'it_buy_5d') {
            aVal = a.it_buy_5d ?? -Infinity;
            bVal = b.it_buy_5d ?? -Infinity;
        } else if (field === 'revenue_yoy') {
            aVal = a.revenue_yoy ?? -Infinity;
            bVal = b.revenue_yoy ?? -Infinity;
        } else if (field === 'amount') {
            aVal = a.amount ?? -Infinity;
            bVal = b.amount ?? -Infinity;
        } else if (field === 'margin_ratio') {
            aVal = a.margin_ratio ?? -Infinity;
            bVal = b.margin_ratio ?? -Infinity;
        } else if (field === 'volatility') {
            aVal = a.volatility ?? Infinity;
            bVal = b.volatility ?? Infinity;
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
            if (activeFactors.has('new_high') && !h.is_high_5d) return false;
            if (activeFactors.has('high_20d') && !h.is_high_20d) return false;
            if (activeFactors.has('high_200d') && !h.is_high_200d) return false;
            if (activeFactors.has('weight_top10') && (h.weightRank ?? Infinity) > 10) return false;
            if (activeFactors.has('amount_top10') && (h.amountRank ?? Infinity) > 10) return false;
            if (activeFactors.has('yoy_20') && (h.revenue_yoy ?? -Infinity) <= 20) return false;
            if (activeFactors.has('low_vol') && ((h.volatility ?? Infinity) >= 8 || h.volatility == null)) return false;
            if (activeFactors.has('margin_high10') && (h.marginRankHigh ?? Infinity) > 10) return false;
            if (activeFactors.has('margin_low10') && (h.marginRankLow ?? Infinity) > 10) return false;
            if (activeFactors.has('momentum') && !h.momentum_pass) return false;
            if (activeFactors.has('it_buy') && !h.it_buy_5d_pass) return false;
            if (activeFactors.has('rev_new_high') && !h.rev_ma3_new_high) return false;
            if (activeFactors.has('all_shared') && h.shared_count < selectedEtfs.size) return false;
            if (activeFactors.has('golden_zone')) {
                const yoy = h.revenue_yoy;
                if (yoy === null || yoy < 50 || yoy > 100) return false;
            }
            if (activeFactors.has('explosive_zone')) {
                const yoy = h.revenue_yoy;
                if (yoy === null || yoy <= 100) return false;
            }
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
            {(() => {
                const inactive = 'bg-white/60 text-slate-500 border-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700';
                const colorMap: Record<string, string> = {
                    orange:  'bg-orange-100 text-orange-700 border-orange-400 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-600',
                    lime:    'bg-lime-100 text-lime-700 border-lime-400 dark:bg-lime-900/50 dark:text-lime-300 dark:border-lime-600',
                    red:     'bg-red-100 text-red-700 border-red-400 dark:bg-red-900/50 dark:text-red-300 dark:border-red-600',
                    indigo:  'bg-indigo-100 text-indigo-700 border-indigo-400 dark:bg-indigo-900/50 dark:text-indigo-300 dark:border-indigo-600',
                    cyan:    'bg-cyan-100 text-cyan-700 border-cyan-400 dark:bg-cyan-900/50 dark:text-cyan-300 dark:border-cyan-600',
                    teal:    'bg-teal-100 text-teal-700 border-teal-400 dark:bg-teal-900/50 dark:text-teal-300 dark:border-teal-600',
                    slate:   'bg-slate-200 text-slate-700 border-slate-400 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-500',
                    purple:  'bg-purple-100 text-purple-700 border-purple-400 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-600',
                    pink:    'bg-pink-100 text-pink-700 border-pink-400 dark:bg-pink-900/50 dark:text-pink-300 dark:border-pink-600',
                    emerald: 'bg-emerald-100 text-emerald-700 border-emerald-400 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-600',
                    blue:    'bg-blue-100 text-blue-700 border-blue-400 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-600',
                    violet:  'bg-violet-100 text-violet-700 border-violet-400 dark:bg-violet-900/50 dark:text-violet-300 dark:border-violet-600',
                    amber:   'bg-amber-100 text-amber-700 border-amber-400 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-600',
                    yellow:  'bg-yellow-100 text-yellow-700 border-yellow-400 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-600',
                    rose:    'bg-rose-100 text-rose-700 border-rose-400 dark:bg-rose-900/50 dark:text-rose-300 dark:border-rose-600',
                };

                const renderChip = (key: FactorFilter, label: string, color: string) => {
                    const active = activeFactors.has(key);
                    return (
                        <button
                            key={key}
                            onClick={() => toggleFactor(key)}
                            className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-all select-none cursor-pointer ${active ? colorMap[color] : inactive}`}
                        >
                            {active && <span className="mr-1">✓</span>}
                            {label}
                        </button>
                    );
                };

                return (
                    <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                        {/* 新高 */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 w-16 shrink-0">新高</span>
                            {renderChip('new_high', '創5日高', 'orange')}
                            {renderChip('high_20d', '創20日高', 'lime')}
                            {renderChip('high_200d', '創200日高', 'red')}
                        </div>
                        {/* 量化M·T·R */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 w-16 shrink-0">量化M·T·R</span>
                            {renderChip('momentum', 'M 動能正', 'emerald')}
                            {renderChip('it_buy', 'T 投信買超', 'blue')}
                            {renderChip('rev_new_high', 'R 營收新高', 'violet')}
                        </div>
                        {/* 基本因子 */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 w-16 shrink-0">基本</span>
                            {renderChip('weight_top10', '權重前10', 'indigo')}
                            {renderChip('amount_top10', '成交前10', 'cyan')}
                            {renderChip('yoy_20', 'YoY>20%', 'teal')}
                            {renderChip('low_vol', '低波動<8%', 'slate')}
                            {renderChip('margin_high10', '高資前10', 'purple')}
                            {renderChip('margin_low10', '低資前10', 'pink')}
                        </div>
                        {/* 進階 */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 w-16 shrink-0">進階</span>
                            {renderChip('all_shared', `${selectedEtfs.size}方共持`, 'amber')}
                            {renderChip('golden_zone', '黃金區間', 'yellow')}
                            {renderChip('explosive_zone', '爆發區間', 'rose')}
                            {activeFactors.size > 0 && (
                                <button
                                    onClick={() => setActiveFactors(new Set())}
                                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline ml-1"
                                >
                                    清除
                                </button>
                            )}
                        </div>
                    </div>
                );
            })()}

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
                                onClick={() => handleSort('it_buy_5d')}
                            >
                                投信5日 <TableSortIcon field="it_buy_5d" currentSortField={sortField} currentSortOrder={sortOrder} />
                            </th>
                            <th
                                className="text-center py-2 px-2 font-medium cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 whitespace-nowrap"
                                onClick={() => handleSort('revenue_yoy')}
                            >
                                YOY% <TableSortIcon field="revenue_yoy" currentSortField={sortField} currentSortOrder={sortOrder} />
                            </th>
                            <th
                                className="text-center py-2 px-2 font-medium cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 whitespace-nowrap"
                                onClick={() => handleSort('amount')}
                            >
                                成交額 <TableSortIcon field="amount" currentSortField={sortField} currentSortOrder={sortOrder} />
                            </th>
                            <th
                                className="text-center py-2 px-2 font-medium cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 whitespace-nowrap"
                                onClick={() => handleSort('margin_ratio')}
                            >
                                資券% <TableSortIcon field="margin_ratio" currentSortField={sortField} currentSortOrder={sortOrder} />
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
                                                href={toStockLink(h.stock_code, sortField, sortOrder)}
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
