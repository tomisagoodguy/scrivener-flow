"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
    ArrowUp, ArrowDown, ChevronRight, TrendingUp, Activity, 
    BarChart3, DollarSign, Percent, Zap, Trophy, Flame, 
    Ship, Rocket, Target, Filter, XCircle, Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface Holding {
    stock_id: string;
    stock_code: string;
    stock_name: string;
    shares: number;
    weight: number;
    price: number | null;
    change_percent: number | null;
    amount: number | null;
    currency: string | null;
    margin_ratio?: number;
    volatility?: number;
    market_cap?: number;
    is_high_5d?: boolean;
    is_high_20d?: boolean;
    is_high_200d?: boolean;
    monthly_revenue?: number;
    revenue_yoy?: number;
    revenue_mom?: number;
    revenue_momentum_rank?: number;
}

interface HoldingsTableProps {
    initialData: Holding[];
}

type SortField = 'weight' | 'shares' | 'amount' | 'margin_ratio' | 'change_percent' | 'volatility' | 'market_cap' | 'monthly_revenue' | 'revenue_yoy' | 'revenue_mom' | 'revenue_momentum_rank' | 'price';
type SortOrder = 'asc' | 'desc';

export function HoldingsTable({ initialData }: HoldingsTableProps) {
    const router = useRouter();
    const [sortField, setSortField] = useState<SortField>('weight');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
    const [activeFilters, setActiveFilters] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Pre-calculate filter results
    const filterOptions = useMemo(() => {
        const topWeightThreshold = [...initialData].sort((a, b) => (b.weight || 0) - (a.weight || 0)).slice(0, 10).map(d => d.stock_code);
        const topAmountThreshold = [...initialData].sort((a, b) => (b.amount || 0) - (a.amount || 0)).slice(0, 10).map(d => d.stock_code);
        const topMarginThreshold = [...initialData].sort((a, b) => (b.margin_ratio || 0) - (a.margin_ratio || 0)).slice(0, 10).map(d => d.stock_code);
        const bottomMarginThreshold = [...initialData].sort((a, b) => (a.margin_ratio || 0) - (b.margin_ratio || 0)).slice(0, 10).map(d => d.stock_code);

        const baseFilters = [
            { id: 'high', label: '創新高', icon: Rocket, color: 'emerald', filter: (d: Holding) => !!d.is_high_5d },
            { id: 'weight', label: '權重前10', icon: Trophy, color: 'indigo', filter: (d: Holding) => topWeightThreshold.includes(d.stock_code) },
            { id: 'amount', label: '成交前10', icon: Zap, color: 'amber', filter: (d: Holding) => topAmountThreshold.includes(d.stock_code) },
            { id: 'yoy', label: 'YoY >20%', icon: TrendingUp, color: 'rose', filter: (d: Holding) => (d.revenue_yoy || 0) > 20 },
            { id: 'momentum', label: 'PR > 80', icon: Flame, color: 'purple', filter: (d: Holding) => (d.revenue_momentum_rank || 0) > 0.8 },
            { id: 'low_vol', label: '低波動 <12%', icon: Activity, color: 'teal', filter: (d: Holding) => (d.volatility || 0) > 0 && (d.volatility || 0) < 12 },
            { id: 'high_margin', label: '高資前10', icon: ArrowUp, color: 'orange', filter: (d: Holding) => topMarginThreshold.includes(d.stock_code) },
            { id: 'low_margin', label: '低資前10', icon: ArrowDown, color: 'blue', filter: (d: Holding) => bottomMarginThreshold.includes(d.stock_code) },
        ];

        return baseFilters.map(opt => {
            // Calculate dynamic count: if this filter were applied to the CURRENT selection
            // We want to show how many stocks satisfy (current filters + this filter)
            // But to keep it intuitive, we show how many stocks satisfy (all OTHER active filters + this filter)
            const otherActiveFilters = activeFilters.filter(id => id !== opt.id);
            let currentPool = initialData;
            
            otherActiveFilters.forEach(fid => {
                const otherOpt = baseFilters.find(o => o.id === fid);
                if (otherOpt) currentPool = currentPool.filter(otherOpt.filter);
            });

            const matchCount = currentPool.filter(opt.filter).length;
            const totalCount = initialData.filter(opt.filter).length;

            return { ...opt, matchCount, totalCount };
        });
    }, [initialData, activeFilters]);

    const filteredData = useMemo(() => {
        let result = initialData;
        
        // Search filter
        if (searchTerm) {
            result = result.filter(d => 
                d.stock_name.includes(searchTerm) || d.stock_code.includes(searchTerm)
            );
        }

        // Active metrics intersection
        if (activeFilters.length > 0) {
            activeFilters.forEach(filterId => {
                const opt = filterOptions.find(o => o.id === filterId);
                if (opt) {
                    result = result.filter(opt.filter);
                }
            });
        }

        // Sorting
        return result.sort((a, b) => {
            const valA = a[sortField] ?? -Infinity;
            const valB = b[sortField] ?? -Infinity;
            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }, [initialData, activeFilters, sortField, sortOrder, filterOptions, searchTerm]);

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
        router.push(`/investment/dashboard/${stock.stock_code}`);
    };

    const SortIndicator = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <span className="w-4" />;
        return sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />;
    };

    const formatNumber = (num: number | null | undefined, decimals = 2) => {
        if (num === null || num === undefined) return '-';
        return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    };

    const formatBillions = (num: number | null | undefined) => {
        if (!num) return '-';
        return (num / 100000000).toFixed(1);
    };

    const getNewHighBadge = (item: Holding) => {
        const badges = [];
        if (item.is_high_200d) {
             badges.push(<span key="200" className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200 shadow-sm">200H</span>);
        } else if (item.is_high_20d) {
             badges.push(<span key="20" className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200 shadow-sm">20H</span>);
        } else if (item.is_high_5d) {
             badges.push(<span key="5" className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200 shadow-sm">5H</span>);
        }
        return badges;
    };

    const getMomentumColor = (rank: number) => {
        if (rank >= 0.8) return 'from-indigo-500 to-purple-600';
        if (rank >= 0.6) return 'from-blue-400 to-indigo-500';
        if (rank >= 0.4) return 'from-teal-400 to-blue-400';
        if (rank >= 0.2) return 'from-yellow-400 to-orange-400';
        return 'from-slate-300 to-slate-400';
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
                        <tr>
                            <th scope="col" className="px-4 py-3 font-semibold tracking-wider text-slate-600 dark:text-slate-300">股票</th>
                            
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

                            <th scope="col" className="px-2 py-3 cursor-pointer group text-right" onClick={() => handleSort('amount')}>
                                <div className="flex items-center justify-end group-hover:text-blue-600 transition-colors">
                                    成交(億) <SortIndicator field="amount" />
                                </div>
                            </th>

                            <th scope="col" className="px-2 py-3 cursor-pointer group text-right" onClick={() => handleSort('monthly_revenue')}>
                                <div className="flex items-center justify-end group-hover:text-blue-600 transition-colors">
                                    營收(億) <SortIndicator field="monthly_revenue" />
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
                            <motion.tr 
                                layout
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                key={item.stock_code} 
                                onClick={() => handleRowClick(item)}
                                className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group border-b border-slate-50 dark:border-slate-800/50"
                            >
                                {/* Stock Code & Name */}
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col min-w-[60px]">
                                            <span className="font-bold text-slate-800 dark:text-slate-100 text-sm group-hover:text-blue-600 transition-colors">{item.stock_name}</span>
                                            <span className="text-xs text-slate-500 font-mono tracking-tight">{item.stock_code}</span>
                                        </div>
                                        <div className="flex flex-col justify-center gap-1">
                                            {getNewHighBadge(item)}
                                        </div>
                                    </div>
                                </td>

                                {/* Price */}
                                <td className="px-2 py-3 text-right">
                                    <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                                        {formatNumber(item.price)}
                                    </span>
                                </td>

                                {/* Change % */}
                                <td className="px-2 py-3 text-right">
                                     <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold font-mono min-w-[60px] justify-end ${
                                        (item.change_percent || 0) > 0 
                                            ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' 
                                            : (item.change_percent || 0) < 0 
                                                ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' 
                                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                    }`}>
                                        {(item.change_percent || 0) > 0 ? '+' : ''}{item.change_percent?.toFixed(2)}%
                                    </span>
                                </td>

                                {/* Amount - Capital Concentration */}
                                <td className="px-2 py-3 text-right">
                                    <div className="flex flex-col items-end gap-1">
                                        <span className={`font-mono text-sm font-bold ${(item.amount || 0) > (maxAmount * 0.5) ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'}`}>
                                            {item.amount ? (item.amount / 100000000).toFixed(1) : '-'}
                                        </span>
                                        <div className="w-20 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-gradient-to-r from-yellow-400 to-amber-600 shadow-[0_0_8px_rgba(245,158,11,0.5)]" 
                                                style={{ width: `${Math.min(((item.amount || 0) / maxAmount) * 100, 100)}%` }} 
                                            />
                                        </div>
                                    </div>
                                </td>

                                {/* Revenue */}
                                <td className="px-2 py-3 text-right">
                                    <span className="font-mono text-sm text-slate-700 dark:text-slate-300 font-medium tracking-tight">
                                        {formatBillions(item.monthly_revenue)}
                                    </span>
                                </td>

                                {/* YoY */}
                                <td className="px-2 py-3 text-right">
                                    <div className="flex justify-end">
                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold font-mono min-w-[56px] justify-end ${
                                            (item.revenue_yoy || 0) > 20 ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border border-red-200' :
                                            (item.revenue_yoy || 0) > 0 ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
                                            (item.revenue_yoy || 0) < -20 ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border border-green-200' :
                                            (item.revenue_yoy || 0) < 0 ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' :
                                            'text-slate-400'
                                        }`}>
                                            {(item.revenue_yoy !== undefined && item.revenue_yoy !== null) ? `${item.revenue_yoy > 0 ? '+' : ''}${item.revenue_yoy.toFixed(1)}%` : '-'}
                                        </span>
                                    </div>
                                </td>

                                {/* MoM */}
                                <td className="px-2 py-3 text-right">
                                    <div className="flex justify-end">
                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold font-mono min-w-[56px] justify-end ${
                                             (item.revenue_mom || 0) > 20 ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border border-red-200' :
                                             (item.revenue_mom || 0) > 0 ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
                                             (item.revenue_mom || 0) < -20 ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border border-green-200' :
                                             (item.revenue_mom || 0) < 0 ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' :
                                             'text-slate-400'
                                         }`}>
                                            {(item.revenue_mom !== undefined && item.revenue_mom !== null) ? `${item.revenue_mom > 0 ? '+' : ''}${item.revenue_mom.toFixed(1)}%` : '-'}
                                         </span>
                                    </div>
                                </td>

                                {/* Momentum Bar */}
                                <td className="px-4 py-3 align-middle">
                                    <div className="w-full max-w-[120px] h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full bg-gradient-to-r ${getMomentumColor(item.revenue_momentum_rank || 0)}`} 
                                            style={{ width: `${(item.revenue_momentum_rank || 0) * 100}%` }}
                                        />
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-1 font-mono">
                                        {item.revenue_momentum_rank ? `PR ${(item.revenue_momentum_rank * 100).toFixed(0)}` : 'N/A'}
                                    </div>
                                </td>

                                {/* Margin Usage - Leverage Appetite */}
                                <td className="px-2 py-3 text-right">
                                     <span className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded ${
                                         (item.margin_ratio || 0) > 40 ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border border-red-200' :
                                         (item.margin_ratio || 0) > 20 ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400' :
                                         (item.margin_ratio || 0) > 10 ? 'text-blue-600 dark:text-blue-400' :
                                         'text-slate-400'
                                     }`}>
                                        {item.margin_ratio ? `${item.margin_ratio.toFixed(1)}%` : '-'}
                                    </span>
                                </td>

                                {/* Shares */}
                                <td className="px-2 py-3 text-right font-mono text-xs text-slate-500">
                                    {item.shares?.toLocaleString()}
                                </td>

                                {/* Weight */}
                                <td className="px-4 py-3 text-right">
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">{item.weight}%</span>
                                        <div className="w-16 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-slate-400 dark:bg-slate-500" style={{ width: `${Math.min(item.weight * 5, 100)}%` }} />
                                        </div>
                                    </div>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    );
}
