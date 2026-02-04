/**
 * useHoldingsFilter Hook
 * 
 * 從 HoldingsTable 抽離的篩選與排序邏輯
 */

import { useState, useMemo, useCallback } from 'react';
import { Holding } from '@/types/investment';
import { 
    filterAndSortHoldings, 
    FILTER_DEFINITIONS, 
    SortField, 
    SortOrder,
    getRankedHoldings
} from '@/lib/investment/holdingFilters';

interface FilterOption {
    id: string;
    label: string;
    matchCount: number;
    totalCount: number;
}

interface UseHoldingsFilterResult {
    // 狀態
    sortField: SortField;
    sortOrder: SortOrder;
    activeFilters: string[];
    searchTerm: string;
    
    // 計算結果
    filteredData: Holding[];
    filterOptions: FilterOption[];
    
    // 操作方法
    handleSort: (field: SortField) => void;
    toggleFilter: (id: string) => void;
    setSearchTerm: (term: string) => void;
    clearFilters: () => void;
}

export function useHoldingsFilter(initialData: Holding[]): UseHoldingsFilterResult {
    const [sortField, setSortField] = useState<SortField>('weight');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
    const [activeFilters, setActiveFilters] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // 準備排名資料
    const dataWithRank = useMemo(() => getRankedHoldings(initialData), [initialData]);

    // 篩選與排序
    const filteredData = useMemo(() => {
        return filterAndSortHoldings(initialData, activeFilters, searchTerm, sortField, sortOrder);
    }, [initialData, activeFilters, searchTerm, sortField, sortOrder]);

    // 計算篩選選項的計數
    const filterOptions = useMemo(() => {
        return FILTER_DEFINITIONS.map(def => {
            const otherActiveFilters = activeFilters.filter(id => id !== def.id);
            
            let currentPool = dataWithRank;
            otherActiveFilters.forEach(fid => {
                const otherDef = FILTER_DEFINITIONS.find(d => d.id === fid);
                if (otherDef) currentPool = currentPool.filter(d => otherDef.filter(d, d));
            });

            const matchCount = currentPool.filter(d => def.filter(d, d)).length;
            const totalCount = dataWithRank.filter(d => def.filter(d, d)).length;

            return { 
                id: def.id,
                label: def.label,
                matchCount, 
                totalCount 
            };
        });
    }, [dataWithRank, activeFilters]);

    // 排序處理
    const handleSort = useCallback((field: SortField) => {
        const newOrder = sortField === field && sortOrder === 'desc' ? 'asc' : 'desc';
        setSortField(field);
        setSortOrder(newOrder);
    }, [sortField, sortOrder]);

    // 篩選切換
    const toggleFilter = useCallback((id: string) => {
        setActiveFilters(prev => 
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    }, []);

    // 清除所有篩選
    const clearFilters = useCallback(() => {
        setActiveFilters([]);
        setSearchTerm('');
    }, []);

    return {
        sortField,
        sortOrder,
        activeFilters,
        searchTerm,
        filteredData,
        filterOptions,
        handleSort,
        toggleFilter,
        setSearchTerm,
        clearFilters,
    };
}
