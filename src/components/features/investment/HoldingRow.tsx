'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Holding } from '@/types/investment';

interface HoldingRowProps {
    item: Holding;
    maxAmount: number;
    onClick: (stock: Holding) => void;
}

function formatNumber(num: number | null | undefined, decimals = 2): string {
    if (num === null || num === undefined) return '-';
    return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function getNewHighBadge(item: Holding) {
    if (item.is_high_200d) {
        return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200 shadow-sm">200H</span>;
    }
    if (item.is_high_20d) {
        return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200 shadow-sm">20H</span>;
    }
    if (item.is_high_5d) {
        return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200 shadow-sm">5H</span>;
    }
    return null;
}

function getMomentumColor(rank: number): string {
    if (rank >= 0.8) return 'from-indigo-500 to-purple-600';
    if (rank >= 0.6) return 'from-blue-400 to-indigo-500';
    if (rank >= 0.4) return 'from-teal-400 to-blue-400';
    if (rank >= 0.2) return 'from-yellow-400 to-orange-400';
    return 'from-slate-300 to-slate-400';
}

export function HoldingRow({ item, maxAmount, onClick }: HoldingRowProps) {

    return (
        <motion.tr 
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => onClick(item)}
            className={`bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group border-b border-slate-50 dark:border-slate-800/50 relative ${
                item.filter_score === 3
                    ? 'border-l-[3px] border-l-amber-400'
                    : item.filter_score === 2
                    ? 'border-l-[3px] border-l-blue-300'
                    : 'border-l-[3px] border-l-transparent'
            }`}
        >
            {/* Rank */}
            <td className="sticky left-0 w-12 px-4 py-3 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 transition-colors z-20">
                <span className={`font-mono text-xs font-bold ${(item.weightRank || 0) <= 3 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                    {item.weightRank}
                </span>
            </td>

            {/* Stock Code & Name - Fixed Column */}
            <td className="sticky left-[48px] w-[100px] max-w-[100px] px-2 py-3 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 transition-colors z-10 border-r border-slate-100 dark:border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] overflow-hidden">
                <div className="flex items-center gap-2">
                    <div className="flex flex-col min-w-0">
                        <span className="font-bold text-slate-800 dark:text-slate-100 text-sm group-hover:text-blue-600 transition-colors tracking-tight truncate" title={item.stock_name}>{item.stock_name}</span>
                        <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-[10px] text-slate-400 font-mono font-medium shrink-0">{item.stock_code}</span>
                            {item.industry && (
                                <span
                                    title={item.industry}
                                    className="max-w-[60px] truncate text-[9px] px-1 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-sm font-medium border border-blue-100 dark:border-blue-800/50"
                                >
                                    {item.industry}
                                </span>
                            )}
                            {(item.topics ?? []).length > 0 && (
                                <span
                                    className="text-[9px] px-1 py-0.5 rounded-full font-medium whitespace-nowrap bg-indigo-50 text-indigo-500 border border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-700/50 shrink-0"
                                    title={(item.topics ?? []).map(t => t.short_name).join('、')}
                                >
                                    {(item.topics ?? []).length}題材
                                </span>
                            )}
                        </div>
                    </div>
                    {getNewHighBadge(item)}
                    {item.is_disposal && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700">
                            處置中
                        </span>
                    )}
                </div>
            </td>

            {/* Price */}
            <td className="px-2 py-3 text-right">
                <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
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

            {/* Volatility */}
            <td className="px-2 py-3 text-right">
                <span className={`font-mono text-xs font-bold ${
                    (item.volatility || 0) >= 12 ? 'text-rose-500' : 
                    (item.volatility || 0) > 0 && (item.volatility || 0) < 8 ? 'text-emerald-500' : 
                    'text-slate-600 dark:text-slate-400'
                }`}>
                    {item.volatility ? `${item.volatility.toFixed(1)}%` : '-'}
                </span>
            </td>

            {/* Amount - Capital Concentration */}
            <td className="px-2 py-3 text-right">
                <div className="flex flex-col items-end gap-1">
                    <span className={`font-mono text-sm font-bold ${(item.amount || 0) > (maxAmount * 0.5) ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'}`}>
                        {item.amount ? (item.amount / 1000000).toFixed(1) : '-'}
                    </span>
                    <div className="w-20 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-linear-to-r from-yellow-400 to-amber-600 shadow-[0_0_8px_rgba(245,158,11,0.5)]" 
                            style={{ width: `${Math.min(((item.amount || 0) / maxAmount) * 100, 100)}%` }} 
                        />
                    </div>
                </div>
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
                        className={`h-full bg-linear-to-r ${getMomentumColor(item.revenue_momentum_rank || 0)}`} 
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

            {/* Quant Filters */}
            <td className="px-3 py-3">
                <div className="flex flex-col gap-1">
                    {/* Triple Pass crown */}
                    {item.filter_score === 3 && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-700 mb-0.5 w-fit">
                            🏆 三大全過
                        </span>
                    )}

                    {/* filterScore 總評分背景 */}
                    <div className="flex items-center gap-1 flex-wrap">
                        {/* Momentum badge */}
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold leading-none ${
                            item.momentum_pass
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                        }`} title={item.momentum_60d != null ? `60日動能: ${item.momentum_60d > 0 ? '+' : ''}${item.momentum_60d}%` : '動能資料不足'}>
                            M {item.momentum_pass ? '✓' : '✗'}
                        </span>

                        {/* 投信 badge */}
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold leading-none ${
                            item.it_buy_5d_pass
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                                : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                        }`} title={item.it_buy_5d != null ? `投信5日: ${item.it_buy_5d > 0 ? '+' : ''}${item.it_buy_5d?.toLocaleString()}張` : '投信資料不足'}>
                            T {item.it_buy_5d_pass ? '✓' : '✗'}
                        </span>

                        {/* Rev New High badge */}
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold leading-none ${
                            item.rev_ma3_new_high
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                        }`} title={item.rev_ma3 != null ? `RevMA3: ${(item.rev_ma3 / 1000).toFixed(0)}M${item.rev_ma3_new_high ? ' ⭐12月新高' : ''}` : '營收資料不足'}>
                            R {item.rev_ma3_new_high ? '✓' : '✗'}
                        </span>
                    </div>

                    {/* filter_score 火力條 */}
                    {(item.filter_score ?? 0) > 0 && (
                        <div className="flex gap-0.5">
                            {[0, 1, 2].map(i => (
                                <div key={i} className={`h-1 w-4 rounded-full ${
                                    i < (item.filter_score ?? 0)
                                        ? item.filter_score === 3 ? 'bg-amber-400'
                                        : item.filter_score === 2 ? 'bg-blue-400'
                                        : 'bg-slate-400'
                                        : 'bg-slate-100 dark:bg-slate-800'
                                }`} />
                            ))}
                        </div>
                    )}
                </div>
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
    );
}
