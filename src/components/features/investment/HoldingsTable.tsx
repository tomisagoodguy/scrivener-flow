"use client";

import React, { useState } from 'react';
import { ArrowUp, ArrowDown, ChevronRight, TrendingUp, Activity, BarChart3, DollarSign, Percent } from 'lucide-react';
import { PriceChartModal } from './PriceChartModal';

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

type SortField = 'weight' | 'shares' | 'amount' | 'margin_ratio' | 'change_percent' | 'volatility' | 'market_cap' | 'monthly_revenue' | 'revenue_yoy' | 'revenue_mom' | 'revenue_momentum_rank';
type SortOrder = 'asc' | 'desc';

export function HoldingsTable({ initialData }: HoldingsTableProps) {
    const [data, setData] = useState(initialData);
    const [sortField, setSortField] = useState<SortField>('weight');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
    const [selectedStock, setSelectedStock] = useState<{ code: string; name: string } | null>(null);
    const [isChartModalOpen, setIsChartModalOpen] = useState(false);

    const handleSort = (field: SortField) => {
        const newOrder = sortField === field && sortOrder === 'desc' ? 'asc' : 'desc';
        setSortField(field);
        setSortOrder(newOrder);
        
        const sorted = [...data].sort((a, b) => {
            const valA = a[field] ?? -Infinity;
            const valB = b[field] ?? -Infinity;
            
            if (valA < valB) return newOrder === 'asc' ? -1 : 1;
            if (valA > valB) return newOrder === 'asc' ? 1 : -1;
            return 0;
        });
        
        setData(sorted);
    };

    const handleRowClick = (stock: Holding) => {
        setSelectedStock({ code: stock.stock_code, name: stock.stock_name });
        setIsChartModalOpen(true);
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
    const maxAmount = Math.max(...data.map(d => d.amount || 0), 1);

    return (
        <div className="w-full bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-full"> 
            <div className="overflow-auto flex-1 custom-scrollbar">
                <table className="w-full text-sm text-left relative border-collapse">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 dark:bg-slate-800/80 dark:text-slate-400 sticky top-0 z-20 backdrop-blur-md shadow-sm">
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
                        {data.map((item) => (
                            <tr 
                                key={item.stock_code} 
                                onClick={() => handleRowClick(item)}
                                className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
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
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <PriceChartModal 
                isOpen={isChartModalOpen}
                onClose={() => setIsChartModalOpen(false)}
                holdings={initialData}
                initialIndex={selectedStock && initialData ? initialData.findIndex(h => h.stock_code === selectedStock.code) : 0}
            />
        </div>
    );
}
