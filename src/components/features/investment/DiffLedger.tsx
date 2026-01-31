'use client';

import { 
    ClockIcon, 
    ArrowRightIcon, 
    TrendingUpIcon, 
    TrendingDownIcon, 
    TrashIcon, 
    RocketIcon 
} from 'lucide-react';

interface DiffLog {
    id: string;
    data_date: string;
    change_type: 'IN' | 'OUT' | 'BUY' | 'SELL';
    stock_code: string;
    stock_name: string;
    diff_shares: number;
    diff_weight: number;
    description: string;
}

interface DiffLedgerProps {
    logs: DiffLog[];
}

export function DiffLedger({ logs }: DiffLedgerProps) {
    if (!logs || logs.length === 0) {
        return (
            <div className="text-center py-10 text-slate-400 text-sm">
                目前沒有異動紀錄
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {logs.map((log) => (
                <div 
                    key={log.id} 
                    className="flex items-center justify-between p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm hover:border-slate-300 transition-colors"
                >
                    <div className="flex items-center gap-4">
                        {/* Icon Box */}
                        <div className={`
                            w-10 h-10 rounded-full flex items-center justify-center shrink-0
                            ${log.change_type === 'IN' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : ''}
                            ${log.change_type === 'OUT' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : ''}
                            ${log.change_type === 'BUY' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : ''}
                            ${log.change_type === 'SELL' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : ''}
                        `}>
                            {log.change_type === 'IN' && <RocketIcon size={20} />}
                            {log.change_type === 'OUT' && <TrashIcon size={20} />}
                            {log.change_type === 'BUY' && <TrendingUpIcon size={20} />}
                            {log.change_type === 'SELL' && <TrendingDownIcon size={20} />}
                        </div>
                        
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 dark:text-white">
                                    {log.stock_name}
                                </span>
                                <span className="text-xs font-mono text-slate-400">
                                    {log.stock_code}
                                </span>
                                <span className={`
                                    text-xs px-2 py-0.5 rounded-full font-medium
                                    ${log.change_type === 'IN' ? 'bg-green-100 text-green-700' : ''}
                                    ${log.change_type === 'OUT' ? 'bg-red-100 text-red-700' : ''}
                                    ${log.change_type === 'BUY' ? 'bg-blue-50 text-blue-700' : ''}
                                    ${log.change_type === 'SELL' ? 'bg-amber-50 text-amber-700' : ''}
                                `}>
                                    {log.change_type}
                                </span>
                            </div>
                            <div className="text-sm text-slate-500 mt-0.5">
                                {log.data_date} • 
                                {log.change_type === 'IN' ? ' 新增持股' : ''}
                                {log.change_type === 'OUT' ? ' 剔除持股' : ''}
                                {log.change_type === 'BUY' && ` 加碼 ${log.diff_shares.toLocaleString()} 股`}
                                {log.change_type === 'SELL' && ` 減碼 ${Math.abs(log.diff_shares).toLocaleString()} 股`}
                            </div>
                        </div>
                    </div>

                    <div className="text-right">
                        <div className={`font-mono font-medium ${log.diff_weight > 0 ? 'text-green-600' : log.diff_weight < 0 ? 'text-red-600' : 'text-slate-500'}`}>
                            {log.diff_weight > 0 ? '+' : ''}{log.diff_weight}%
                        </div>
                        <div className="text-xs text-slate-400">權重變動</div>
                    </div>
                </div>
            ))}
        </div>
    );
}
