'use client';

import { useMemo, useState } from 'react';
import { BareKSlideContent } from '@/components/features/investment/BareKSlideContent';
import { ScrollChartViewer } from '@/components/features/investment/ScrollChartViewer';
import type { StockSlide } from '@/components/features/investment/BareKScrollViewer';
import type { StrategyMonitorStock } from '@/components/features/strategy/StrategyMonitorCard';
import type { BareKSnapshot } from '@/app/api/investment/bare-k/[code]/route';
import {
    FAN_BREAKOUT_SIGNAL_LABEL,
    formatSignedPct,
    type FanBreakoutRow,
    type FanBreakoutSignalType,
} from '@/lib/investment/fanBreakout';
import {
    DEFAULT_CHART_STOCK_FILTERS,
    countStocksByStrategy,
    filterChartStocks,
    type ChartStockFilters,
} from '@/lib/investment/strategyUtils';
import StrategyChartFilterBar from './StrategyChartFilterBar';

interface Props {
    stocks: StrategyMonitorStock[];
    snapshots: Map<string, BareKSnapshot | null>;
    /** strategy id → 中文名稱；查無時顯示原 id */
    strategyLabels: Record<string, string>;
    /** 均線發散最新訊號日的候選（stockId → 列）；查詢失敗時為空物件 */
    fanBreakoutByStock: Record<string, FanBreakoutRow>;
}

interface ChartSlide extends StockSlide {
    fan: FanBreakoutRow | null;
}

/** 「發散 +8.7%・再次・連續 4 天」；缺值的部分略過 */
function fanContext(row: FanBreakoutRow): string {
    const parts: string[] = [];
    if (row.spread !== null) parts.push(`發散 ${formatSignedPct(row.spread)}`);
    if (row.signalType) parts.push(FAN_BREAKOUT_SIGNAL_LABEL[row.signalType]);
    if (row.consecDays !== null) parts.push(`連續 ${row.consecDays} 天`);
    return parts.join('・');
}

export function StrategyChartViewer({ stocks, snapshots, strategyLabels, fanBreakoutByStock }: Props) {
    const [filters, setFilters] = useState<ChartStockFilters>(DEFAULT_CHART_STOCK_FILTERS);

    const strategyOptions = useMemo(
        () =>
            Object.entries(countStocksByStrategy(stocks)).map(([id, count]) => ({
                id,
                label: strategyLabels[id] ?? id,
                count,
            })),
        [stocks, strategyLabels],
    );

    const slides = useMemo<ChartSlide[]>(() => {
        const fanSignalTypes: Record<string, FanBreakoutSignalType | null> = {};
        for (const [id, row] of Object.entries(fanBreakoutByStock)) fanSignalTypes[id] = row.signalType;
        return filterChartStocks(stocks, filters, fanSignalTypes).map((s) => ({
            code: s.stock_id,
            name: s.name ?? '',
            strategies: s.strategies.map((id) => strategyLabels[id] ?? id),
            snapshot: snapshots.get(s.stock_id) ?? null,
            fan: fanBreakoutByStock[s.stock_id] ?? null,
        }));
    }, [stocks, filters, fanBreakoutByStock, strategyLabels, snapshots]);

    return (
        // space-y-6 抵銷捲動子導覽列的 -mt-6，不壓到篩選列
        <div className="space-y-6">
            <StrategyChartFilterBar
                filters={filters}
                onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
                strategyOptions={strategyOptions}
            />
            {slides.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">沒有符合篩選條件的股票</p>
            ) : (
                // 篩選條件當 key：清單換了就重掛載，回到第 1 支
                <ScrollChartViewer
                    key={JSON.stringify(filters)}
                    slides={slides}
                    initialIndex={0}
                    backHref="/investment/strategy"
                    renderHeaderExtra={(slide) =>
                        slide.fan && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">{fanContext(slide.fan)}</span>
                        )
                    }
                    renderSlide={(slide) => (
                        <BareKSlideContent
                            code={slide.code}
                            name={slide.name}
                            strategies={slide.strategies}
                            snapshot={slide.snapshot}
                            noSnapshotMessage="此股票尚未同步裸K資料，將於今日 Pipeline 執行後更新"
                            markerDates={slide.fan?.recentSignalDates}
                        />
                    )}
                />
            )}
        </div>
    );
}
