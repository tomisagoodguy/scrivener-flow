'use client';

import { useMemo } from 'react';
import { BareKSlideContent } from '@/components/features/investment/BareKSlideContent';
import { ScrollChartViewer } from '@/components/features/investment/ScrollChartViewer';
import type { StockSlide } from '@/components/features/investment/BareKScrollViewer';
import type { BareKSnapshot } from '@/app/api/investment/bare-k/[code]/route';
import type { EquityRow, Tier } from '@/lib/investment/equityPageData';
import { formatEquityHeader } from '@/lib/investment/equityChartUtils';

interface Props {
    rows: EquityRow[];
    snapshots: Map<string, BareKSnapshot | null>;
    /** 股票 → 持有的 E 經理人 ETF 代號，當作圖表標籤 */
    etfMap: Record<string, string[]>;
    tier: Tier | null;
    backHref: string;
    /** 清單識別；變動時重掛載檢視器回到第 1 檔 */
    listKey: string;
}

interface EquitySlide extends StockSlide {
    header: string;
}

export function EquityChartViewer({ rows, snapshots, etfMap, tier, backHref, listKey }: Props) {
    const slides = useMemo<EquitySlide[]>(
        () =>
            rows.map((r) => ({
                code: r.stock_code,
                name: r.stock_name ?? '',
                strategies: etfMap[r.stock_code] ?? [],
                snapshot: snapshots.get(r.stock_code) ?? null,
                header: formatEquityHeader(r, tier),
            })),
        [rows, etfMap, snapshots, tier],
    );

    if (slides.length === 0) {
        return <p className="text-sm text-gray-500 dark:text-gray-400">此清單目前沒有股票</p>;
    }

    return (
        // pt-6 抵銷捲動子導覽列的 -mt-6，不壓到上方的觀察區間列
        <div className="pt-6">
            <ScrollChartViewer
                key={listKey}
                slides={slides}
                initialIndex={0}
                backHref={backHref}
                renderHeaderExtra={(slide) =>
                    slide.header && <span className="text-xs text-gray-500 dark:text-gray-400">{slide.header}</span>
                }
                renderSlide={(slide) => (
                    <BareKSlideContent
                        code={slide.code}
                        name={slide.name}
                        strategies={slide.strategies}
                        snapshot={slide.snapshot}
                        noSnapshotMessage="此股票尚未同步裸K資料，將於下次 Pipeline 執行後更新"
                    />
                )}
            />
        </div>
    );
}
