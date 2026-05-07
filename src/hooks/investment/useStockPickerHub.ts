'use client';

import { useState, useMemo, useCallback } from 'react';
import { ETF_REGISTRY } from '@/lib/investment/etfRegistry';
import type {
    EtfData,
    QuantFilter,
    UnifiedHolding,
    SortField,
    SortOrder,
    FactorFilter,
} from '@/components/features/investment/StockPickerHub.types';

const ETF_CODES = ETF_REGISTRY.map(e => e.code);

export function buildUnifiedHoldings(
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

    for (const entry of result) {
        entry.shared_count = Object.keys(entry.weights).filter(e => selectedEtfs.has(e)).length;
        entry.maxWeight = Math.max(...Object.values(entry.weights));
    }

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

export function sortHoldings(
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

export interface StockPickerHubHookReturn {
    panelStock: { code: string; name: string } | null;
    searchQuery: string;
    selectedEtfs: Set<string>;
    activeFactors: Set<FactorFilter>;
    sortField: SortField;
    sortOrder: SortOrder;
    etfColorMap: Record<string, string>;
    unifiedHoldings: UnifiedHolding[];
    filteredHoldings: UnifiedHolding[];
    sortedHoldings: UnifiedHolding[];
    activeEtfCodes: string[];
    openPanel: (code: string, name: string) => void;
    closePanel: () => void;
    setSearchQuery: (q: string) => void;
    toggleEtf: (code: string) => void;
    toggleFactor: (factor: FactorFilter) => void;
    clearFactors: () => void;
    handleSort: (field: SortField) => void;
}

export function useStockPickerHub(
    etfs: EtfData[],
    quantFilters: Record<string, QuantFilter>,
    signals: Record<string, { strength: 1 | 2 | 3; type: string }> = {}
): StockPickerHubHookReturn {
    void signals; // signals passed through to consumers, not used in computations

    const [panelStock, setPanelStock] = useState<{ code: string; name: string } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEtfs, setSelectedEtfs] = useState<Set<string>>(new Set(ETF_CODES));
    const [activeFactors, setActiveFactors] = useState<Set<FactorFilter>>(new Set());
    const [sortField, setSortField] = useState<SortField>('filter_score');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

    const openPanel = useCallback((code: string, name: string) => setPanelStock({ code, name }), []);
    const closePanel = useCallback(() => setPanelStock(null), []);

    const toggleEtf = useCallback((code: string) => {
        setSelectedEtfs(prev => {
            const next = new Set(prev);
            if (next.has(code)) {
                if (next.size === 1) return prev;
                next.delete(code);
            } else {
                next.add(code);
            }
            return next;
        });
    }, []);

    const toggleFactor = useCallback((factor: FactorFilter) => {
        setActiveFactors(prev => {
            const next = new Set(prev);
            if (next.has(factor)) next.delete(factor);
            else next.add(factor);
            return next;
        });
    }, []);

    const clearFactors = useCallback(() => setActiveFactors(new Set()), []);

    const handleSort = useCallback((field: SortField) => {
        setSortField(prev => {
            if (prev === field) {
                setSortOrder(o => o === 'desc' ? 'asc' : 'desc');
                return prev;
            }
            setSortOrder('desc');
            return field;
        });
    }, []);

    const etfColorMap = useMemo(() => {
        const map: Record<string, string> = {};
        for (const etf of etfs) map[etf.etf_code] = etf.color;
        return map;
    }, [etfs]);

    const unifiedHoldings = useMemo(
        () => buildUnifiedHoldings(etfs, selectedEtfs, quantFilters),
        [etfs, selectedEtfs, quantFilters]
    );

    const filteredHoldings = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        const baseList = q
            ? unifiedHoldings.filter(h =>
                h.stock_code.toLowerCase().includes(q) ||
                h.stock_name.toLowerCase().includes(q)
            )
            : unifiedHoldings;
        if (activeFactors.size === 0) return baseList;
        return baseList.filter(h => {
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
    }, [unifiedHoldings, activeFactors, selectedEtfs.size, searchQuery]);

    const sortedHoldings = useMemo(
        () => sortHoldings(filteredHoldings, sortField, sortOrder),
        [filteredHoldings, sortField, sortOrder]
    );

    const activeEtfCodes = useMemo(
        () => ETF_CODES.filter(c => selectedEtfs.has(c)),
        [selectedEtfs]
    );

    return {
        panelStock,
        searchQuery,
        selectedEtfs,
        activeFactors,
        sortField,
        sortOrder,
        etfColorMap,
        unifiedHoldings,
        filteredHoldings,
        sortedHoldings,
        activeEtfCodes,
        openPanel,
        closePanel,
        setSearchQuery,
        toggleEtf,
        toggleFactor,
        clearFactors,
        handleSort,
    };
}
