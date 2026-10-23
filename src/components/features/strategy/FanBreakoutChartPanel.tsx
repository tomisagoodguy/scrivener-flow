'use client';

import { useMemo } from 'react';
import { StockChart } from '@/components/features/investment/StockChart';
import type { ChartMarker } from '@/lib/investment/indicators';
import type { FanBreakoutRow } from '@/lib/investment/fanBreakout';
import { usePriceData } from '@/hooks/investment/usePriceData';
import { useTheme } from '@/components/providers/ThemeProvider';

const MA_PERIODS = [5, 10, 20, 60, 120] as const;
const NAV_BTN = 'px-3 py-1 text-sm rounded-lg bg-gray-100/70 dark:bg-gray-800/50';

interface Props {
    row: FanBreakoutRow;
    onPrev: () => void;
    onNext: () => void;
}

export default function FanBreakoutChartPanel({ row, onPrev, onNext }: Props) {
    const { theme } = useTheme();
    const { data, loading, error } = usePriceData(row.stockId);
    const markers = useMemo<ChartMarker[]>(
        () => row.recentSignalDates.map((time) => ({ time })),
        [row.recentSignalDates],
    );

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold text-gray-800 dark:text-gray-100">
                    {row.stockId} {row.name}
                </h2>
                <div className="flex gap-2">
                    <button type="button" onClick={onPrev} className={NAV_BTN}>
                        上一檔
                    </button>
                    <button type="button" onClick={onNext} className={NAV_BTN}>
                        下一檔
                    </button>
                </div>
            </div>
            {loading && <p className="text-sm text-gray-400">載入 K 線中…</p>}
            {error && !loading && <p className="text-sm text-gray-400">{error}</p>}
            {data.length > 0 && (
                <StockChart data={data} isDarkMode={theme === 'dark'} maPeriods={MA_PERIODS} markers={markers} />
            )}
        </div>
    );
}
