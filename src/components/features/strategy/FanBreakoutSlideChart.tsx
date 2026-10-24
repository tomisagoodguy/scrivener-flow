'use client';

import { useMemo } from 'react';
import { StockChart } from '@/components/features/investment/StockChart';
import type { ChartMarker } from '@/lib/investment/indicators';
import type { FanBreakoutRow } from '@/lib/investment/fanBreakout';
import { usePriceData } from '@/hooks/investment/usePriceData';
import { useTheme } from '@/components/providers/ThemeProvider';

const MA_PERIODS = [5, 10, 20, 60, 120] as const;

/** 均線發散候選的 K 線圖（MA5/10/20/60/120 + 近 120 日入選日標記），單張面板與連續看圖共用。 */
export default function FanBreakoutSlideChart({ row }: { row: FanBreakoutRow }) {
    const { theme } = useTheme();
    const { data, loading, error } = usePriceData(row.stockId);
    const markers = useMemo<ChartMarker[]>(
        () => row.recentSignalDates.map((time) => ({ time })),
        [row.recentSignalDates],
    );

    return (
        <>
            {loading && <p className="text-sm text-gray-400">載入 K 線中…</p>}
            {error && !loading && <p className="text-sm text-gray-400">{error}</p>}
            {data.length > 0 && (
                <StockChart data={data} isDarkMode={theme === 'dark'} maPeriods={MA_PERIODS} markers={markers} />
            )}
        </>
    );
}
