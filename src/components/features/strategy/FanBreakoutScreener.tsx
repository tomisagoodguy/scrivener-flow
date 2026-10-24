'use client';

import type { FanBreakoutResult } from '@/lib/investment/fanBreakout';
import FanBreakoutChartPanel from './FanBreakoutChartPanel';
import FanBreakoutContinuousView from './FanBreakoutContinuousView';
import FanBreakoutFilterBar from './FanBreakoutFilterBar';
import FanBreakoutTable from './FanBreakoutTable';
import { useFanBreakoutScreener, type FanBreakoutViewMode } from './useFanBreakoutScreener';

const WINDOW_DAYS = 30;
const PAGE_BTN = 'px-2 py-1 rounded-lg bg-gray-100/70 dark:bg-gray-800/50 disabled:opacity-40';
const NO_MATCH = '沒有符合篩選條件的候選。';
const MODES: { mode: FanBreakoutViewMode; label: string }[] = [
    { mode: 'table', label: '表格' },
    { mode: 'continuous', label: '連續看圖' },
];

function shiftDate(iso: string, days: number): string {
    const d = new Date(`${iso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

export default function FanBreakoutScreener({ result }: { result: FanBreakoutResult }) {
    const s = useFanBreakoutScreener(result.rows);
    const maxDate = result.latestDate;
    const minDate = maxDate ? shiftDate(maxDate, -WINDOW_DAYS) : null;
    const { pageInfo } = s;
    const isTable = s.viewMode === 'table';

    return (
        <div className="space-y-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
                候選清單，非投資建議。訊號以還原價計算；績效欄（訊號後報酬、期間最高、期間最低）以收盤價計，未還原。
            </p>

            {result.error ? (
                <div role="alert" className="glass-card p-4 text-sm text-rose-600 dark:text-rose-400">
                    {result.error}
                </div>
            ) : result.rows.length === 0 ? (
                <div className="glass-card p-4 text-sm text-gray-500 dark:text-gray-400">
                    近 30 天無均線發散候選。
                </div>
            ) : (
                <>
                    <div className="glass-card p-4 space-y-3">
                        <FanBreakoutFilterBar
                            filters={s.filters}
                            onChange={s.updateFilters}
                            minDate={minDate}
                            maxDate={maxDate}
                        />
                        <div className="flex gap-1 w-fit bg-gray-100/70 dark:bg-gray-800/50 rounded-xl p-1 text-sm">
                            {MODES.map(({ mode, label }) => (
                                <button
                                    key={mode}
                                    type="button"
                                    aria-pressed={s.viewMode === mode}
                                    onClick={() => s.setViewMode(mode)}
                                    className={`px-3 py-1 rounded-lg transition-all ${
                                        s.viewMode === mode
                                            ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm font-medium'
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        {pageInfo.total === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400">{NO_MATCH}</p>
                        ) : (
                            isTable && (
                                <FanBreakoutTable
                                    items={pageInfo.items}
                                    startIndex={s.pageStartIndex}
                                    selectedIndex={s.selectedIndex}
                                    onSelect={s.select}
                                />
                            )
                        )}
                        {isTable && (
                            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                                <span>共 {pageInfo.total} 筆</span>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        disabled={pageInfo.page <= 1}
                                        onClick={() => s.setPage(pageInfo.page - 1)}
                                        className={PAGE_BTN}
                                    >
                                        上一頁
                                    </button>
                                    <span>{`第 ${pageInfo.page} / ${pageInfo.totalPages} 頁`}</span>
                                    <button
                                        type="button"
                                        disabled={pageInfo.page >= pageInfo.totalPages}
                                        onClick={() => s.setPage(pageInfo.page + 1)}
                                        className={PAGE_BTN}
                                    >
                                        下一頁
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    {isTable && s.selectedRow && (
                        <div className="glass-card p-4">
                            <FanBreakoutChartPanel
                                row={s.selectedRow}
                                onPrev={() => s.move(-1)}
                                onNext={() => s.move(1)}
                            />
                        </div>
                    )}
                    {!isTable && s.continuousRows.length > 0 && (
                        // 篩選條件當 key：清單換了就重掛載，回到第 1 支
                        <FanBreakoutContinuousView
                            key={JSON.stringify(s.filters)}
                            rows={s.continuousRows}
                            initialIndex={s.continuousInitialIndex}
                            onBack={() => s.setViewMode('table')}
                        />
                    )}
                </>
            )}
        </div>
    );
}
