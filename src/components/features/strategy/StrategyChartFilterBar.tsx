'use client';

import { FAN_BREAKOUT_SIGNAL_LABEL } from '@/lib/investment/fanBreakout';
import type { ChartStockFilters } from '@/lib/investment/strategyUtils';

export interface StrategyOption {
    id: string;
    label: string;
    count: number;
}

interface Props {
    filters: ChartStockFilters;
    onChange: (patch: Partial<ChartStockFilters>) => void;
    strategyOptions: StrategyOption[];
}

const SELECT_CLASS =
    'bg-white/50 backdrop-blur-sm border border-gray-200 focus:bg-white rounded-lg px-2 py-1 text-sm dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100';

function isFanSignal(value: string): value is ChartStockFilters['fanSignal'] {
    return value === 'all' || value === 'first' || value === 'repeat';
}

/** 策略圖表頁的篩選列：策略（含檔數）與均線發散訊號類型。 */
export default function StrategyChartFilterBar({ filters, onChange, strategyOptions }: Props) {
    return (
        <div className="glass-card p-3 flex flex-wrap items-end gap-3 text-sm text-gray-600 dark:text-gray-300">
            <label className="flex flex-col gap-1">
                策略
                <select
                    aria-label="策略"
                    className={SELECT_CLASS}
                    value={filters.strategy}
                    onChange={(e) => onChange({ strategy: e.target.value })}
                >
                    <option value="all">全部策略</option>
                    {strategyOptions.map((o) => (
                        <option key={o.id} value={o.id}>{`${o.label}（${o.count}）`}</option>
                    ))}
                </select>
            </label>
            <label className="flex flex-col gap-1">
                均線發散
                <select
                    aria-label="均線發散"
                    className={SELECT_CLASS}
                    value={filters.fanSignal}
                    onChange={(e) => {
                        if (isFanSignal(e.target.value)) onChange({ fanSignal: e.target.value });
                    }}
                >
                    <option value="all">全部</option>
                    <option value="first">{FAN_BREAKOUT_SIGNAL_LABEL.first}</option>
                    <option value="repeat">{FAN_BREAKOUT_SIGNAL_LABEL.repeat}</option>
                </select>
            </label>
        </div>
    );
}
