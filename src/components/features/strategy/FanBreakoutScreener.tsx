'use client';

import type { FanBreakoutResult } from '@/lib/investment/fanBreakout';
import FanBreakoutChartPanel from './FanBreakoutChartPanel';
import FanBreakoutFilterBar from './FanBreakoutFilterBar';
import FanBreakoutTable from './FanBreakoutTable';
import { useFanBreakoutScreener } from './useFanBreakoutScreener';

const WINDOW_DAYS = 30;
const PAGE_BTN = 'px-2 py-1 rounded-lg bg-gray-100/70 dark:bg-gray-800/50 disabled:opacity-40';

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
                        {pageInfo.total === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400">沒有符合篩選條件的候選。</p>
                        ) : (
                            <FanBreakoutTable
                                items={pageInfo.items}
                                startIndex={s.pageStartIndex}
                                selectedIndex={s.selectedIndex}
                                onSelect={s.select}
                            />
                        )}
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
                    </div>
                    {s.selectedRow && (
                        <div className="glass-card p-4">
                            <FanBreakoutChartPanel
                                row={s.selectedRow}
                                onPrev={() => s.move(-1)}
                                onNext={() => s.move(1)}
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
