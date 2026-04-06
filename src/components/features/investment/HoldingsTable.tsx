'use client';

/**
 * HoldingsTable Component (重構版)
 * 
 * 使用 Custom Hook 與拆分後的元件
 */

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { Holding } from '@/types/investment';
import { SortField } from '@/lib/investment/holdingFilters';
import { HoldingRow } from './HoldingRow';
import { HoldingsFilterBar } from './HoldingsFilterBar';
import { HoldingsSearchBar } from './HoldingsSearchBar';
import { useHoldingsFilter } from '@/hooks/investment';

interface HoldingsTableProps {
    initialData: Holding[];
}

interface SortIndicatorProps {
    field: SortField;
    sortField: SortField;
    sortOrder: 'asc' | 'desc';
}

// 排序指示器
const SortIndicator = ({ field, sortField, sortOrder }: SortIndicatorProps) => {
    if (sortField !== field) return <span className="w-4" />;
    return sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />;
};

export function HoldingsTable({ initialData }: HoldingsTableProps) {
    const router = useRouter();
    
    // 使用 Custom Hook 管理篩選與排序邏輯
    const {
        sortField,
        sortOrder,
        activeFilters,
        searchTerm,
        filteredData,
        filterOptions,
        handleSort,
        toggleFilter,
        setSearchTerm,
    } = useHoldingsFilter(initialData);

    // 計算最大成交金額（用於視覺化）
    const maxAmount = useMemo(() => Math.max(...initialData.map(d => d.amount || 0), 1), [initialData]);

    // 列點擊處理
    const handleRowClick = (stock: Holding) => {
        const params = new URLSearchParams();
        if (activeFilters.length > 0) params.set('filters', activeFilters.join(','));
        if (searchTerm) params.set('search', searchTerm);
        params.set('sort', sortField);
        params.set('order', sortOrder);
        
        router.push(`/investment/stock/${stock.stock_code}?${params.toString()}`);
    };

    return (
        <div className="space-y-6">
            {/* 篩選按鈕列 */}
            <HoldingsFilterBar 
                filterOptions={filterOptions}
                activeFilters={activeFilters}
                onToggleFilter={toggleFilter}
            />

            {/* 搜尋與摘要 */}
            <HoldingsSearchBar 
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                matchCount={filteredData.length}
            />

            {/* 主表格 */}
            <div className="w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col min-h-[500px]"> 
                <div className="overflow-auto flex-1 custom-scrollbar">
                    <table className="w-full text-sm text-left relative border-collapse">
                        <thead className="text-[10px] text-slate-400 uppercase bg-slate-50/50 dark:bg-slate-800/50 sticky top-0 z-20 backdrop-blur-xl shadow-sm">
                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-y border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                <th scope="col" className="sticky left-0 w-12 px-4 py-3 bg-slate-50 dark:bg-slate-800 z-20">
                                    #
                                </th>
                                <th scope="col" className="sticky left-[48px] px-4 py-3 bg-slate-50 dark:bg-slate-800 z-20 border-r border-slate-100 dark:border-slate-800">
                                    成分股
                                </th>
                                
                                <th scope="col" className="px-2 py-3 cursor-pointer group text-right" onClick={() => handleSort('price')}>
                                    <div className="flex items-center justify-end group-hover:text-blue-600 transition-colors">
                                        現價 <SortIndicator field="price" sortField={sortField} sortOrder={sortOrder} />
                                    </div>
                                </th>

                                <th scope="col" className="px-2 py-3 cursor-pointer group text-right" onClick={() => handleSort('change_percent')}>
                                    <div className="flex items-center justify-end group-hover:text-blue-600 transition-colors">
                                        漲跌 <SortIndicator field="change_percent" sortField={sortField} sortOrder={sortOrder} />
                                    </div>
                                </th>

                                <th scope="col" className="px-2 py-3 cursor-pointer group text-right" onClick={() => handleSort('volatility')}>
                                    <div className="flex items-center justify-end group-hover:text-blue-600 transition-colors">
                                        波動率 <SortIndicator field="volatility" sortField={sortField} sortOrder={sortOrder} />
                                    </div>
                                </th>

                                <th scope="col" className="px-2 py-3 cursor-pointer group text-right" onClick={() => handleSort('amount')}>
                                    <div className="flex items-center justify-end group-hover:text-blue-600 transition-colors">
                                        成交(百萬) <SortIndicator field="amount" sortField={sortField} sortOrder={sortOrder} />
                                    </div>
                                </th>

                                <th scope="col" className="px-2 py-3 cursor-pointer group text-right" onClick={() => handleSort('revenue_yoy')}>
                                    <div className="flex items-center justify-end group-hover:text-blue-600 transition-colors">
                                        YoY <SortIndicator field="revenue_yoy" sortField={sortField} sortOrder={sortOrder} />
                                    </div>
                                </th>

                                <th scope="col" className="px-2 py-3 cursor-pointer group text-right" onClick={() => handleSort('revenue_mom')}>
                                    <div className="flex items-center justify-end group-hover:text-blue-600 transition-colors">
                                        MoM <SortIndicator field="revenue_mom" sortField={sortField} sortOrder={sortOrder} />
                                    </div>
                                </th>

                                <th scope="col" className="px-4 py-3 cursor-pointer group" onClick={() => handleSort('revenue_momentum_rank')}>
                                    <div className="flex items-center group-hover:text-blue-600 transition-colors">
                                        營收動能 <SortIndicator field="revenue_momentum_rank" sortField={sortField} sortOrder={sortOrder} />
                                    </div>
                                </th>
                                
                                <th scope="col" className="px-2 py-3 cursor-pointer group text-right" onClick={() => handleSort('margin_ratio')}>
                                    <div className="flex items-center justify-end group-hover:text-blue-600 transition-colors">
                                        資使用 <SortIndicator field="margin_ratio" sortField={sortField} sortOrder={sortOrder} />
                                    </div>
                                </th>

                                <th scope="col" className="px-2 py-3 cursor-pointer group text-right" onClick={() => handleSort('shares')}>
                                    <div className="flex items-center justify-end group-hover:text-blue-600 transition-colors">
                                        股數 <SortIndicator field="shares" sortField={sortField} sortOrder={sortOrder} />
                                    </div>
                                </th>

                                <th scope="col" className="px-3 py-3 cursor-pointer group" onClick={() => handleSort('filter_score')}>
                                    <div className="flex items-center gap-1 group-hover:text-blue-600 transition-colors">
                                        量化篩選
                                        <span className="text-[9px] text-slate-400 font-normal group-hover:text-blue-400">(M·T·R)</span>
                                        <SortIndicator field="filter_score" sortField={sortField} sortOrder={sortOrder} />
                                    </div>
                                </th>

                                <th scope="col" className="px-4 py-3 cursor-pointer group text-right" onClick={() => handleSort('weight')}>
                                    <div className="flex items-center justify-end group-hover:text-blue-600 transition-colors">
                                        權重 <SortIndicator field="weight" sortField={sortField} sortOrder={sortOrder} />
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredData.map((item: Holding) => (
                                <HoldingRow
                                    key={item.stock_code}
                                    item={item}
                                    maxAmount={maxAmount}
                                    onClick={handleRowClick}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
