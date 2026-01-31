'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from 'lucide-react';

interface Holding {
    etf_code: string;
    stock_code: string;
    stock_name: string;
    shares: number;
    weight: number;
    data_date: string;
}

interface HoldingsTableProps {
    initialData: Holding[];
}

type SortField = 'weight' | 'shares'; // change is tricky without history in same table, ignore for now
type SortOrder = 'asc' | 'desc';

export function HoldingsTable({ initialData }: HoldingsTableProps) {
    const [data, setData] = useState(initialData);
    const [sortField, setSortField] = useState<SortField>('weight');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
        
        const sorted = [...data].sort((a, b) => {
            const valA = a[field];
            const valB = b[field];
            
            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
        
        setData(sorted);
    };

    return (
        <div className="w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900 dark:text-slate-400">
                        <tr>
                            <th className="px-6 py-3 text-left">成分股</th>
                            <th 
                                className="px-6 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-right"
                                onClick={() => handleSort('shares')}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    股數
                                    {sortField === 'shares' && (
                                        sortOrder === 'desc' ? <ArrowDownIcon size={14} /> : <ArrowUpIcon size={14} />
                                    )}
                                </div>
                            </th>
                            <th 
                                className="px-6 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                                onClick={() => handleSort('weight')}
                            >
                                <div className="flex items-center gap-1">
                                    權重 (%)
                                    {sortField === 'weight' && (
                                        sortOrder === 'desc' ? <ArrowDownIcon size={14} /> : <ArrowUpIcon size={14} />
                                    )}
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item) => (
                            <tr 
                                key={item.stock_code}
                                className="border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                            >
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs">
                                            {item.stock_code}
                                        </span>
                                        <span className="font-medium text-slate-900 dark:text-slate-100">
                                            {item.stock_name}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-400 text-right">
                                    {item.shares.toLocaleString()}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-16 bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                                            <div 
                                                className="bg-blue-600 h-2 rounded-full" 
                                                style={{ width: `${Math.min(item.weight * 5, 100)}%` }} // Scale for visual
                                            ></div>
                                        </div>
                                        <span className="font-mono font-medium">{item.weight}%</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 text-center">
                資料日期: {data.length > 0 ? data[0].data_date : 'N/A'} • 共 {data.length} 檔成分股
            </div>
        </div>
    );
}
