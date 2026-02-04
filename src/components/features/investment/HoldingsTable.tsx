'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
    ArrowUp, ArrowDown, TrendingUp, Activity, 
    Zap, Trophy, Flame, Rocket, Target, XCircle, Search
} from 'lucide-react';
import { motion } from 'framer-motion';
import { 
    Holding 
} from '@/types/investment';
import { 
    filterAndSortHoldings, 
    FILTER_DEFINITIONS, 
    SortField, 
    SortOrder,
    getRankedHoldings
} from '@/lib/investment/holdingFilters';
import { HoldingRow } from './HoldingRow';

interface HoldingsTableProps {
    initialData: Holding[];
}

export function HoldingsTable({ initialData }: HoldingsTableProps) {
    const router = useRouter();
    const [sortField, setSortField] = useState<SortField>('weight');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
    const [activeFilters, setActiveFilters] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Prepare data with ranks for fitler counting logic
    const dataWithRank = useMemo(() => getRankedHoldings(initialData), [initialData]);

    const filteredData = useMemo(() => {
        return filterAndSortHoldings(initialData, activeFilters, searchTerm, sortField, sortOrder);
    }, [initialData, activeFilters, searchTerm, sortField, sortOrder]);

    // Pre-calculate filter UI counts
    const filterOptions = useMemo(() => {
        // Map icon/color from local map to shared definitions
        const uiConfig: Record<string, { icon: any, color: string }> = {
            high: { icon: Rocket, color: 'emerald' },
            weight: { icon: Trophy, color: 'indigo' },
            amount: { icon: Zap, color: 'amber' },
            yoy: { icon: TrendingUp, color: 'rose' },
            momentum: { icon: Flame, color: 'purple' },
            low_vol: { icon: Activity, color: 'teal' },
            high_margin: { icon: ArrowUp, color: 'orange' },
            low_margin: { icon: ArrowDown, color: 'blue' },
        };

        return FILTER_DEFINITIONS.map(def => {
            const config = uiConfig[def.id] || { icon: Target, color: 'indigo' };
            
            // Logic to calculate counts (same as before)
            const otherActiveFilters = activeFilters.filter(id => id !== def.id);
            
            // Base pool is all data (filtered by others)
            let currentPool = dataWithRank;
            otherActiveFilters.forEach(fid => {
                const otherDef = FILTER_DEFINITIONS.find(d => d.id === fid);
                if (otherDef) currentPool = currentPool.filter(d => otherDef.filter(d, d));
            });

            const matchCount = currentPool.filter(d => def.filter(d, d)).length;
            const totalCount = dataWithRank.filter(d => def.filter(d, d)).length;

            return { 
                ...def, 
                ...config,
                matchCount, 
                totalCount 
            };
        });
    }, [dataWithRank, activeFilters]);

    const handleSort = (field: SortField) => {
        const newOrder = sortField === field && sortOrder === 'desc' ? 'asc' : 'desc';
        setSortField(field);
        setSortOrder(newOrder);
    };

    const toggleFilter = (id: string) => {
        setActiveFilters(prev => 
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const handleRowClick = (stock: Holding) => {
        const params = new URLSearchParams();
        if (activeFilters.length > 0) params.set('filters', activeFilters.join(','));
        if (searchTerm) params.set('search', searchTerm);
        params.set('sort', sortField);
        params.set('order', sortOrder);
        
        router.push(`/investment/dashboard/${stock.stock_code}?${params.toString()}`);
    };

    const SortIndicator = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <span className="w-4" />;
        return sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />;
    };

    // Calculate max amount for identifying capital concentration
    const maxAmount = useMemo(() => Math.max(...initialData.map(d => d.amount || 0), 1), [initialData]);

    const colorMap: Record<string, string> = {
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 active:bg-emerald-500 active:text-white',
        indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 active:bg-indigo-500 active:text-white',
        amber: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 active:bg-amber-500 active:text-white',
        rose: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 active:bg-rose-500 active:text-white',
        purple: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 active:bg-purple-500 active:text-white',
        teal: 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100 active:bg-teal-500 active:text-white',
        orange: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 active:bg-orange-500 active:text-white',
        blue: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 active:bg-blue-500 active:text-white',
    };

    const activeColorMap: Record<string, string> = {
        emerald: 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-500/20',
        indigo: 'bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/30 ring-2 ring-indigo-500/20',
        amber: 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/30 ring-2 ring-amber-500/20',
        rose: 'bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-500/30 ring-2 ring-rose-500/20',
        purple: 'bg-purple-500 text-white border-purple-500 shadow-lg shadow-purple-500/30 ring-2 ring-purple-500/20',
        teal: 'bg-teal-500 text-white border-teal-500 shadow-lg shadow-teal-500/30 ring-2 ring-teal-500/20',
        orange: 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/30 ring-2 ring-orange-500/20',
        blue: 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/30 ring-2 ring-blue-500/20',
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                <Target className="w-4 h-4" />
                <span>強勢因子交集篩選 (AND Logic)</span>
                {activeFilters.length > 1 && (
                    <span className="ml-auto bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full animate-pulse">
                        交集中: {activeFilters.length} 個條件
                    </span>
                )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                {filterOptions.map((opt) => {
                    const isActive = activeFilters.includes(opt.id);
                    const Icon = opt.icon;
                    return (
                        <motion.button
                            key={opt.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => toggleFilter(opt.id)}
                            className={`
                                relative flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300
                                ${isActive ? activeColorMap[opt.color] : colorMap[opt.color]}
                                ${opt.matchCount === 0 && !isActive ? 'opacity-40 grayscale pointer-events-none' : 'opacity-100'}
                            `}
                        >
                            <div className={`p-2 rounded-xl mb-2 ${isActive ? 'bg-white/20' : 'bg-white block'}`}>
                                <Icon className={`w-6 h-6 ${isActive ? 'text-white' : ''}`} />
                            </div>
                            <span className="text-[10px] font-bold whitespace-nowrap opacity-90 uppercase tracking-tighter">{opt.label}</span>
                            <div className="mt-1 flex items-baseline gap-1">
                                <span className="text-xl font-black font-mono">
                                    {isActive ? opt.matchCount : opt.matchCount}
                                </span>
                                <span className="text-[10px] opacity-70">
                                    / {opt.totalCount}
                                </span>
                            </div>
                            
                            {isActive && (
                                <motion.div 
                                    layoutId="active-dot" 
                                    className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full border-2 border-indigo-500 z-10 flex items-center justify-center shadow-sm"
                                >
                                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                                </motion.div>
                            )}
                        </motion.button>
                    );
                })}
            </div>

            {/* Interactive Search & Summary */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3 flex-1 w-full relative">
                    <Search className="absolute left-3 w-4 h-4 text-slate-400" />
                    <input 
                        type="text"
                        placeholder="搜尋股票名稱或代碼..."
                        className="w-full bg-slate-50 dark:bg-slate-800 pl-10 pr-4 py-2 rounded-xl text-sm border-none focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute right-3 text-slate-400 hover:text-slate-600">
                            <XCircle className="w-4 h-4" />
                        </button>
                    )}
                </div>
                
                <div className="flex items-center gap-4 text-sm font-medium">
                    <div className="flex items-center gap-2 text-slate-500">
                        目前符合: <span className="text-indigo-600 dark:text-indigo-400 font-bold font-mono text-lg">{filteredData.length}</span> 檔
                    </div>
                </div>
            </div>

            {/* Main Table Container */}
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
                                    現價 <SortIndicator field="change_percent" />
                                </div>
                            </th>

                            <th scope="col" className="px-2 py-3 cursor-pointer group text-right" onClick={() => handleSort('change_percent')}>
                                <div className="flex items-center justify-end group-hover:text-blue-600 transition-colors">
                                    漲跌 <SortIndicator field="change_percent" />
                                </div>
                            </th>

                            <th scope="col" className="px-2 py-3 cursor-pointer group text-right" onClick={() => handleSort('volatility')}>
                                <div className="flex items-center justify-end group-hover:text-blue-600 transition-colors">
                                    波動率 <SortIndicator field="volatility" />
                                </div>
                            </th>

                            <th scope="col" className="px-2 py-3 cursor-pointer group text-right" onClick={() => handleSort('amount')}>
                                <div className="flex items-center justify-end group-hover:text-blue-600 transition-colors">
                                    成交(百萬) <SortIndicator field="amount" />
                                </div>
                            </th>



                           <th scope="col" className="px-2 py-3 cursor-pointer group text-right" onClick={() => handleSort('revenue_yoy')}>
                                <div className="flex items-center justify-end group-hover:text-blue-600 transition-colors">
                                    YoY <SortIndicator field="revenue_yoy" />
                                </div>
                            </th>

                            <th scope="col" className="px-2 py-3 cursor-pointer group text-right" onClick={() => handleSort('revenue_mom')}>
                                <div className="flex items-center justify-end group-hover:text-blue-600 transition-colors">
                                    MoM <SortIndicator field="revenue_mom" />
                                </div>
                            </th>

                            <th scope="col" className="px-4 py-3 cursor-pointer group" onClick={() => handleSort('revenue_momentum_rank')}>
                                <div className="flex items-center group-hover:text-blue-600 transition-colors">
                                    營收動能 <SortIndicator field="revenue_momentum_rank" />
                                </div>
                            </th>
                            
                            <th scope="col" className="px-2 py-3 cursor-pointer group text-right" onClick={() => handleSort('margin_ratio')}>
                                <div className="flex items-center justify-end group-hover:text-blue-600 transition-colors">
                                    資使用 <SortIndicator field="margin_ratio" />
                                </div>
                            </th>

                            <th scope="col" className="px-2 py-3 cursor-pointer group text-right" onClick={() => handleSort('shares')}>
                                <div className="flex items-center justify-end group-hover:text-blue-600 transition-colors">
                                    股數 <SortIndicator field="shares" />
                                </div>
                            </th>

                            <th scope="col" className="px-4 py-3 cursor-pointer group text-right" onClick={() => handleSort('weight')}>
                                <div className="flex items-center justify-end group-hover:text-blue-600 transition-colors">
                                    權重 <SortIndicator field="weight" />
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredData.map((item) => (
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
