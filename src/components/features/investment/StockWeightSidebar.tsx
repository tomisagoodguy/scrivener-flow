'use client';

import React, { useMemo, useState } from 'react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { ArrowDownIcon, ArrowUpIcon, SlidersHorizontal, ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StockTrendChart } from './StockTrendChart';
import { useStockWeightAnalysis, TimeRange } from './hooks/useStockWeightAnalysis';
import { DiffLog } from '@/types/investment';

interface StockWeightSidebarProps {
    logs: DiffLog[];
    children?: React.ReactNode; // For the trigger button
}

type SortKey = 'impact' | 'code' | 'name';
type SortDirection = 'asc' | 'desc';

interface SortIconProps {
    column: SortKey;
    currentKey: SortKey;
    currentDirection: SortDirection;
}

const SortIcon = ({ column, currentKey, currentDirection }: SortIconProps) => {
    if (currentKey !== column) return <ArrowUpDown className="w-3 h-3 text-slate-300 ml-1" />;
    return currentDirection === 'asc' ? 
        <ArrowUpIcon className="w-3 h-3 text-indigo-500 ml-1" /> : 
        <ArrowDownIcon className="w-3 h-3 text-indigo-500 ml-1" />;
};

export function StockWeightSidebar({ logs, children }: StockWeightSidebarProps) {
    const [timeRange, setTimeRange] = useState<TimeRange>('1D');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
        key: 'impact',
        direction: 'desc'
    });
    const [expandedCode, setExpandedCode] = useState<string | null>(null);

    // Use shared hook for data processing
    const { processedData: rawData } = useStockWeightAnalysis(logs, timeRange);

    const processedData = useMemo(() => {
        // Clone array to avoid mutating hook result (though hook returns new array on change)
        const sorted = [...rawData];

        sorted.sort((a, b) => {
            const { key, direction } = sortConfig;
            let comparison = 0;

            if (key === 'impact') {
                comparison = Math.abs(a.impact) - Math.abs(b.impact);
            } else if (key === 'code') {
                comparison = a.code.localeCompare(b.code);
            } else if (key === 'name') {
                comparison = a.name.localeCompare(b.name);
            }

            return direction === 'asc' ? comparison : -comparison;
        });

        return sorted;
    }, [rawData, sortConfig]);

    const handleSort = (key: SortKey) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const toggleExpand = (code: string) => {
        setExpandedCode(current => current === code ? null : code);
    };

    // Auto-expand the first item when data loads to show the feature
    React.useEffect(() => {
        if (processedData.length > 0 && !expandedCode) {
            setExpandedCode(processedData[0].code);
        }
    }, [processedData, expandedCode]);

    return (
        <Sheet>
            <SheetTrigger asChild>
                {children}
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md overflow-y-auto flex flex-col h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800">
                <SheetHeader className="mb-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <SheetTitle className="text-xl font-bold flex items-center gap-2">
                             <SlidersHorizontal className="w-5 h-5 text-slate-500" />
                            資金權重變化明細
                        </SheetTitle>
                    </div>
                    
                    {/* Time Range Selector */}
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-full">
                        {(['1D', '3D', '5D'] as const).map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`flex-1 px-3 py-1.5 text-sm font-bold rounded-md transition-all ${
                                    timeRange === range
                                        ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                }`}
                            >
                                近 {range.replace('D', ' 日')}
                            </button>
                        ))}
                    </div>
                    
                    <SheetDescription className="flex justify-between items-center">
                        <span>顯示權重增減情形</span>
                        <span className="text-xs text-indigo-500 font-medium bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">
                            ✨ 點擊列表查看走勢圖
                        </span>
                    </SheetDescription>
                </SheetHeader>

                {/* Table Header */}
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-500 pb-2 border-b border-slate-100 dark:border-slate-800 mb-2 sticky top-0 bg-white dark:bg-slate-900 z-10">
                    <div className="col-span-2 cursor-pointer flex items-center hover:text-slate-800 dark:hover:text-slate-300" onClick={() => handleSort('code')}>
                        代號 <SortIcon column="code" currentKey={sortConfig.key} currentDirection={sortConfig.direction} />
                    </div>
                    <div className="col-span-4 cursor-pointer flex items-center hover:text-slate-800 dark:hover:text-slate-300" onClick={() => handleSort('name')}>
                        名稱 <SortIcon column="name" currentKey={sortConfig.key} currentDirection={sortConfig.direction} />
                    </div>
                    <div className="col-span-6 text-right cursor-pointer flex items-center justify-end hover:text-slate-800 dark:hover:text-slate-300" onClick={() => handleSort('impact')}>
                        權重變化 <SortIcon column="impact" currentKey={sortConfig.key} currentDirection={sortConfig.direction} />
                    </div>
                </div>

                {/* List */}
                <div className="space-y-1 flex-1 overflow-y-auto min-h-0 pr-1">
                    {processedData.map((item) => (
                        <div key={item.code} className="transition-all">
                             {/* Main Row */}
                            <div 
                                className={cn(
                                    "grid grid-cols-12 gap-2 py-3 border-b border-slate-50 dark:border-slate-800/50 items-center hover:bg-slate-50 dark:hover:bg-slate-800/30 rounded-lg px-2 transition-colors cursor-pointer select-none",
                                    expandedCode === item.code && "bg-slate-50 dark:bg-slate-800/30"
                                )}
                                onClick={() => toggleExpand(item.code)}
                            >
                                <div className="col-span-2 text-xs font-mono text-slate-400 flex items-center gap-1">
                                    {item.code}
                                </div>
                                <div className="col-span-4 text-sm font-bold text-slate-700 dark:text-slate-200 truncate flex items-center gap-1">
                                    {item.name}
                                    {expandedCode === item.code ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-300" />}
                                </div>
                                <div className="col-span-6 text-right flex items-center justify-end gap-2">
                                    <span className={cn(
                                        "text-sm font-bold font-mono tracking-tight",
                                        item.impact > 0 ? "text-rose-500" : item.impact < 0 ? "text-emerald-500" : "text-slate-400"
                                    )}>
                                        {item.impact > 0 ? '+' : ''}{item.impact.toFixed(2)}%
                                    </span>
                                    {/* Visual Bar */}
                                    <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
                                        <div 
                                            className={cn(
                                                "h-full absolute top-0",
                                                item.impact > 0 ? "bg-rose-500 right-1/2 rounded-r-full" : "bg-emerald-500 left-1/2 rounded-l-full"
                                            )}
                                            style={{ 
                                                width: `${Math.min(Math.abs(item.impact) * 100, 50)}%` 
                                            }}
                                        />
                                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Chart */}
                            {expandedCode === item.code && (
                                <div className="px-2 py-3 bg-slate-50/50 dark:bg-slate-800/20 mb-2 rounded-b-lg -mt-1 mx-2">
                                    <div className="h-32 w-full">
                                        <StockTrendChart code={item.code} logs={logs} />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    {processedData.length === 0 && (
                        <div className="text-center py-12 text-slate-400 text-sm">
                            查無資料
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
