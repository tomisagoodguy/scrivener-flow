'use client';

/**
 * HoldingsFilterBar Component
 * 
 * 從 HoldingsTable 抽離的篩選 UI 元件
 */

import React from 'react';
import { 
    ArrowUp, ArrowDown, TrendingUp, Activity, 
    Zap, Trophy, Flame, Rocket, Target, LucideIcon
} from 'lucide-react';
import { motion } from 'framer-motion';

interface FilterOption {
    id: string;
    label: string;
    matchCount: number;
    totalCount: number;
}

interface HoldingsFilterBarProps {
    filterOptions: FilterOption[];
    activeFilters: string[];
    onToggleFilter: (id: string) => void;
}

// 篩選按鈕的 UI 配置
const FILTER_UI_CONFIG: Record<string, { icon: LucideIcon; color: string }> = {
    high: { icon: Rocket, color: 'emerald' },
    weight: { icon: Trophy, color: 'indigo' },
    amount: { icon: Zap, color: 'amber' },
    yoy: { icon: TrendingUp, color: 'rose' },
    momentum: { icon: Flame, color: 'purple' },
    low_vol: { icon: Activity, color: 'teal' },
    high_margin: { icon: ArrowUp, color: 'orange' },
    low_margin: { icon: ArrowDown, color: 'blue' },
};

const COLOR_MAP: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 active:bg-emerald-500 active:text-white',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 active:bg-indigo-500 active:text-white',
    amber: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 active:bg-amber-500 active:text-white',
    rose: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 active:bg-rose-500 active:text-white',
    purple: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 active:bg-purple-500 active:text-white',
    teal: 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100 active:bg-teal-500 active:text-white',
    orange: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 active:bg-orange-500 active:text-white',
    blue: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 active:bg-blue-500 active:text-white',
};

const ACTIVE_COLOR_MAP: Record<string, string> = {
    emerald: 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-500/20',
    indigo: 'bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/30 ring-2 ring-indigo-500/20',
    amber: 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/30 ring-2 ring-amber-500/20',
    rose: 'bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-500/30 ring-2 ring-rose-500/20',
    purple: 'bg-purple-500 text-white border-purple-500 shadow-lg shadow-purple-500/30 ring-2 ring-purple-500/20',
    teal: 'bg-teal-500 text-white border-teal-500 shadow-lg shadow-teal-500/30 ring-2 ring-teal-500/20',
    orange: 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/30 ring-2 ring-orange-500/20',
    blue: 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/30 ring-2 ring-blue-500/20',
};

export function HoldingsFilterBar({ 
    filterOptions, 
    activeFilters, 
    onToggleFilter 
}: HoldingsFilterBarProps) {
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
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
                    const config = FILTER_UI_CONFIG[opt.id] || { icon: Target, color: 'indigo' };
                    const Icon = config.icon;
                    const color = config.color;
                    
                    return (
                        <motion.button
                            key={opt.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onToggleFilter(opt.id)}
                            className={`
                                relative flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300
                                ${isActive ? ACTIVE_COLOR_MAP[color] : COLOR_MAP[color]}
                                ${opt.matchCount === 0 && !isActive ? 'opacity-40 grayscale pointer-events-none' : 'opacity-100'}
                            `}
                        >
                            <div className={`p-2 rounded-xl mb-2 ${isActive ? 'bg-white/20' : 'bg-white block'}`}>
                                <Icon className={`w-6 h-6 ${isActive ? 'text-white' : ''}`} />
                            </div>
                            <span className="text-[10px] font-bold whitespace-nowrap opacity-90 uppercase tracking-tighter">
                                {opt.label}
                            </span>
                            <div className="mt-1 flex items-baseline gap-1">
                                <span className="text-xl font-black font-mono">
                                    {opt.matchCount}
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
        </div>
    );
}
