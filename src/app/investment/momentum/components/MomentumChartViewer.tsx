'use client';

import { useMemo } from 'react';
import { BareKSlideContent } from '@/components/features/investment/BareKSlideContent';
import { ScrollChartViewer } from '@/components/features/investment/ScrollChartViewer';
import type { StockSlide } from '@/components/features/investment/BareKScrollViewer';
import type { BareKSnapshot } from '@/app/api/investment/bare-k/[code]/route';
import type { WindowMomentumStock } from '@/app/actions/getWindowMomentum';
import { formatMomentumEtfTags, formatMomentumHeader } from '@/lib/investment/windowMomentumUtils';

interface Props {
    stocks: WindowMomentumStock[];
    snapshots: Map<string, BareKSnapshot | null>;
    /** 返回卡片視角（保留目前篩選） */
    backHref: string;
}

interface MomentumSlide extends StockSlide {
    header: string;
    markerDates: string[];
}

/** 同步加碼股的連續裸K看盤：標籤為加碼 ETF 與張數，K 線標記加碼日 */
export function MomentumChartViewer({ stocks, snapshots, backHref }: Props) {
    const slides = useMemo<MomentumSlide[]>(
        () =>
            stocks.map((s) => ({
                code: s.stockCode,
                name: s.stockName,
                strategies: formatMomentumEtfTags(s.etfDetails),
                snapshot: snapshots.get(s.stockCode) ?? null,
                header: formatMomentumHeader(s.etfCount, s.totalWeightChange),
                markerDates: s.accumulationDates,
            })),
        [stocks, snapshots],
    );

    return (
        <ScrollChartViewer
            slides={slides}
            initialIndex={0}
            backHref={backHref}
            renderHeaderExtra={(slide) => (
                <span className="text-xs text-gray-500 dark:text-gray-400">{slide.header}</span>
            )}
            renderSlide={(slide) => (
                <BareKSlideContent
                    code={slide.code}
                    name={slide.name}
                    strategies={slide.strategies}
                    snapshot={slide.snapshot}
                    noSnapshotMessage="此股票尚未同步裸K資料，將於今日 Pipeline 執行後更新"
                    markerDates={slide.markerDates}
                />
            )}
        />
    );
}
