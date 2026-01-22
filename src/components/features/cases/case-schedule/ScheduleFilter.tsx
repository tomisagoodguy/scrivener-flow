import React from 'react';
import { FilterType } from './types';

interface ScheduleFilterProps {
    filter: FilterType;
    setFilter: (val: FilterType) => void;
    totalCount: number;
}

export function ScheduleFilter({ filter, setFilter, totalCount }: ScheduleFilterProps) {
    const filters: { key: FilterType; label: string; activeClass: string }[] = [
        { key: 'future', label: '🔮 未來', activeClass: 'bg-indigo-600 text-white shadow-sm' },
        { key: 'today', label: '📅 今天', activeClass: 'bg-indigo-600 text-white shadow-sm' },
        { key: 'expired', label: '⚠️ 已過期', activeClass: 'bg-red-600 text-white shadow-sm' },
        { key: 'all', label: '📋 全部', activeClass: 'bg-slate-600 text-white shadow-sm' },
    ];

    return (
        <div className="flex gap-2 flex-wrap">
            {filters.map((f) => (
                <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === f.key
                        ? f.activeClass
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                >
                    {f.label}
                </button>
            ))}
            <div className="ml-auto text-xs text-slate-400 flex items-center">
                共 {totalCount} 筆
            </div>
        </div>
    );
}
