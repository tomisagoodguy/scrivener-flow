'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    TrendingUpIcon,
    TrendingDownIcon,
    TrashIcon,
    RocketIcon,
    MinusCircleIcon,
    ClockIcon,
} from 'lucide-react';
import { DiffLog } from '@/types/investment';
import { getEtfMeta } from '@/lib/investment/etfRegistry';

interface DiffListGroupProps {
    logs: DiffLog[];
    dateIndex: number;
}

const CHANGE_TYPE_ORDER: Record<string, number> = {
    IN: 0,
    OUT: 1,
    BUY: 2,
    SELL: 3,
    CLOSE: 4,
};

function getStatusConfig(type: string) {
    switch (type) {
        case 'IN':
            return { icon: RocketIcon, badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' };
        case 'OUT':
            return { icon: TrashIcon, badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' };
        case 'BUY':
            return { icon: TrendingUpIcon, badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' };
        case 'SELL':
            return { icon: TrendingDownIcon, badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' };
        case 'CLOSE':
            return { icon: MinusCircleIcon, badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' };
        default:
            return { icon: ClockIcon, badge: 'bg-slate-500/10 text-slate-600 border-slate-500/20' };
    }
}

export function DiffListGroup({ logs, dateIndex }: DiffListGroupProps) {
    const router = useRouter();

    // 偵測同日同股票出現在 2+ 支 ETF 的「共識訊號」
    const consensusStocks = useMemo(() => {
        const byStock = new Map<string, Set<string>>();
        for (const log of logs) {
            if (!log.etf_code) continue;
            if (!byStock.has(log.stock_code)) byStock.set(log.stock_code, new Set());
            byStock.get(log.stock_code)!.add(log.etf_code);
        }
        return new Set(
            [...byStock.entries()]
                .filter(([, etfs]) => etfs.size >= 2)
                .map(([code]) => code)
        );
    }, [logs]);

    // 排序：IN/OUT 優先，同 type 再按 |diff_weight| 降序
    const sortedLogs = useMemo(() => {
        return [...logs].sort((a, b) => {
            const orderDiff = (CHANGE_TYPE_ORDER[a.change_type] ?? 9) - (CHANGE_TYPE_ORDER[b.change_type] ?? 9);
            if (orderDiff !== 0) return orderDiff;
            return Math.abs(b.diff_weight) - Math.abs(a.diff_weight);
        });
    }, [logs]);

    return (
        <div className="space-y-1">
            {sortedLogs.map((log, idx) => {
                const config = getStatusConfig(log.change_type);
                const StatusIcon = config.icon;
                const etfMeta = log.etf_code ? getEtfMeta(log.etf_code) : undefined;
                const isConsensus = consensusStocks.has(log.stock_code);

                return (
                    <motion.div
                        key={log.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: (dateIndex * 0.05) + (idx * 0.02) }}
                        onClick={() => router.push(`/investment/stock/${log.stock_code}`)}
                        className="flex items-center gap-2 py-2 px-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group"
                    >
                        {/* ETF 色塊徽章 */}
                        <div className="w-14 shrink-0">
                            {etfMeta ? (
                                <span
                                    className="inline-block w-full text-center px-1 py-0.5 rounded text-[9px] font-black tracking-wider"
                                    style={{ backgroundColor: etfMeta.color + '20', color: etfMeta.color, border: `1px solid ${etfMeta.color}44` }}
                                >
                                    {etfMeta.shortCode}
                                </span>
                            ) : (
                                <span className="inline-block w-full text-center px-1 py-0.5 rounded text-[9px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800">
                                    —
                                </span>
                            )}
                        </div>

                        {/* 異動類型 icon */}
                        <StatusIcon className="w-3.5 h-3.5 shrink-0 text-slate-400" />

                        {/* 股票名稱 + 代碼 + 產業 */}
                        <div className="flex-1 min-w-0 flex items-center gap-1.5">
                            <span className="font-bold text-sm text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {log.stock_name}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 shrink-0">
                                {log.stock_code}
                            </span>
                            {log.industry && (
                                <span className="hidden sm:inline px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded text-[9px] font-bold border border-indigo-100 dark:border-indigo-800/50 shrink-0">
                                    {log.industry}
                                </span>
                            )}
                        </div>

                        {/* 異動類型 badge */}
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter border ${config.badge}`}>
                            {log.change_type}
                        </span>

                        {/* 權重變化 */}
                        <div className="w-16 text-right shrink-0">
                            <span className={`text-sm font-mono font-black ${log.diff_weight > 0 ? 'text-rose-500' : log.diff_weight < 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                                {log.diff_weight > 0 ? '▲' : log.diff_weight < 0 ? '▼' : ''}
                                {Math.abs(log.diff_weight).toFixed(2)}%
                            </span>
                        </div>

                        {/* 共識訊號 */}
                        <div className="w-5 text-center shrink-0">
                            {isConsensus && (
                                <span title="多支 ETF 同日異動" className="text-amber-500 text-xs font-black">★</span>
                            )}
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}
