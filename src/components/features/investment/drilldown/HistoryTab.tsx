'use client';

import { useMemo, useState } from 'react';
import { RankingTrendChart } from '../RankingTrendChart';
import type { RankingDataRow } from '../RankingTrendChart';
import { HoldingSparklineGrid } from '../HoldingSparklineGrid';
import { EmptyState } from './PositionsTab';

const TIME_RANGE_OPTIONS = [
    { key: '3m' as const, label: '近3月' },
    { key: '6m' as const, label: '近6月' },
    { key: 'all' as const, label: '全部' },
];

const VIEW_OPTIONS = [
    { key: 'chart' as const, label: '折線圖' },
    { key: 'sparkline' as const, label: 'Sparkline' },
];

export function HistoryTab({ historyData }: { historyData?: RankingDataRow[] }) {
    const [historyView, setHistoryView] = useState<'chart' | 'sparkline'>('chart');
    const [timeRange, setTimeRange] = useState<'3m' | '6m' | 'all'>('all');

    const filteredData = useMemo(() => {
        if (!historyData || timeRange === 'all') return historyData ?? [];
        const days = timeRange === '3m' ? 90 : 180;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffStr = cutoff.toISOString().slice(0, 10);
        return historyData.filter(r => r.data_date >= cutoffStr);
    }, [historyData, timeRange]);

    if (!historyData) return <EmptyState message="歷史比重軌跡" />;

    const btnBase = 'px-2.5 py-1 rounded-md text-[11px] font-bold transition-all';
    const btnActive = 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm';
    const btnInactive = 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300';

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                    {TIME_RANGE_OPTIONS.map(opt => (
                        <button
                            key={opt.key}
                            onClick={() => setTimeRange(opt.key)}
                            className={`${btnBase} ${timeRange === opt.key ? btnActive : btnInactive}`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                    {VIEW_OPTIONS.map(opt => (
                        <button
                            key={opt.key}
                            onClick={() => setHistoryView(opt.key)}
                            className={`${btnBase} ${historyView === opt.key ? btnActive : btnInactive}`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>
            {historyView === 'chart'
                ? <RankingTrendChart data={filteredData} />
                : <HoldingSparklineGrid data={historyData} timeRange={timeRange} />
            }
        </div>
    );
}
