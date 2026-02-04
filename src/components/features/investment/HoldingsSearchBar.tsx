'use client';

/**
 * HoldingsSearchBar Component
 * 
 * 從 HoldingsTable 抽離的搜尋與摘要 UI 元件
 */

import React from 'react';
import { Search, XCircle } from 'lucide-react';

interface HoldingsSearchBarProps {
    searchTerm: string;
    onSearchChange: (term: string) => void;
    matchCount: number;
}

export function HoldingsSearchBar({ 
    searchTerm, 
    onSearchChange, 
    matchCount 
}: HoldingsSearchBarProps) {
    return (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 flex-1 w-full relative">
                <Search className="absolute left-3 w-4 h-4 text-slate-400" />
                <input 
                    type="text"
                    placeholder="搜尋股票名稱或代碼..."
                    className="w-full bg-slate-50 dark:bg-slate-800 pl-10 pr-4 py-2 rounded-xl text-sm border-none focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
                {searchTerm && (
                    <button 
                        onClick={() => onSearchChange('')} 
                        className="absolute right-3 text-slate-400 hover:text-slate-600"
                    >
                        <XCircle className="w-4 h-4" />
                    </button>
                )}
            </div>
            
            <div className="flex items-center gap-4 text-sm font-medium">
                <div className="flex items-center gap-2 text-slate-500">
                    目前符合: 
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold font-mono text-lg">
                        {matchCount}
                    </span> 
                    檔
                </div>
            </div>
        </div>
    );
}
