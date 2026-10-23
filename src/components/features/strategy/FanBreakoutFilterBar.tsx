'use client';

import type { FanBreakoutFilters } from '@/lib/investment/fanBreakout';

interface Props {
    filters: FanBreakoutFilters;
    onChange: (patch: Partial<FanBreakoutFilters>) => void;
    /** 日期區間可選範圍（30 天視窗）；null 表示不限 */
    minDate: string | null;
    maxDate: string | null;
}

const INPUT_CLASS =
    'bg-white/50 backdrop-blur-sm border border-gray-200 focus:bg-white rounded-lg px-2 py-1 text-sm dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100';

export default function FanBreakoutFilterBar({ filters, onChange, minDate, maxDate }: Props) {
    return (
        <div className="flex flex-wrap items-end gap-3 text-sm text-gray-600 dark:text-gray-300">
            <label className="flex flex-col gap-1">
                起始日期
                <input
                    type="date"
                    aria-label="起始日期"
                    className={INPUT_CLASS}
                    value={filters.dateFrom ?? ''}
                    min={minDate ?? undefined}
                    max={maxDate ?? undefined}
                    onChange={(e) => onChange({ dateFrom: e.target.value || null })}
                />
            </label>
            <label className="flex flex-col gap-1">
                結束日期
                <input
                    type="date"
                    aria-label="結束日期"
                    className={INPUT_CLASS}
                    value={filters.dateTo ?? ''}
                    min={minDate ?? undefined}
                    max={maxDate ?? undefined}
                    onChange={(e) => onChange({ dateTo: e.target.value || null })}
                />
            </label>
            <label className="flex flex-col gap-1">
                類型
                <select
                    aria-label="類型"
                    className={INPUT_CLASS}
                    value={filters.signalType}
                    onChange={(e) => {
                        const v = e.target.value;
                        onChange({ signalType: v === 'first' || v === 'repeat' ? v : 'all' });
                    }}
                >
                    <option value="all">全部</option>
                    <option value="first">首次</option>
                    <option value="repeat">再次</option>
                </select>
            </label>
            <label className="flex flex-col gap-1">
                最少連續天數
                <input
                    type="number"
                    aria-label="最少連續天數"
                    min={1}
                    className={`${INPUT_CLASS} w-24`}
                    value={filters.minConsecDays}
                    onChange={(e) => {
                        const n = Number(e.target.value);
                        onChange({ minConsecDays: Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1 });
                    }}
                />
            </label>
            <label className="flex flex-col gap-1">
                市場
                <select
                    aria-label="市場"
                    className={INPUT_CLASS}
                    value={filters.market}
                    onChange={(e) => {
                        const v = e.target.value;
                        onChange({ market: v === '上市' || v === '上櫃' ? v : 'all' });
                    }}
                >
                    <option value="all">全部</option>
                    <option value="上市">上市</option>
                    <option value="上櫃">上櫃</option>
                </select>
            </label>
        </div>
    );
}
