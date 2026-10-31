'use client';

import { useMemo } from 'react';
import { ScrollChartViewer, type ScrollSlide } from '@/components/features/investment/ScrollChartViewer';
import { LazyBareKSlide } from '@/components/features/investment/pool/LazyBareKSlide';
import type { EquityRow, Tier } from '@/lib/investment/equityPageData';
import { formatEquityHeader } from '@/lib/investment/equityChartUtils';

/** 超過此檔數時跳轉點會超出畫面而無法點擊，改靠子導覽列的上一檔／下一檔 */
const MAX_JUMP_DOT_ROWS = 30;

interface Props {
    rows: EquityRow[];
    /** 股票 → 持有的 E 經理人 ETF 代號，當作圖表標籤 */
    etfMap: Record<string, string[]>;
    tier: Tier | null;
    backHref: string;
    /** 清單識別；變動時重掛載檢視器回到第 1 檔 */
    listKey: string;
}

interface EquitySlide extends ScrollSlide {
    strategies: string[];
    header: string;
}

/** 籌碼排行股的連續捲動裸K圖；快照由各段 LazyBareKSlide 按需載入。 */
export function EquityChartViewer({ rows, etfMap, tier, backHref, listKey }: Props) {
    const slides = useMemo<EquitySlide[]>(
        () =>
            rows.map((r) => ({
                code: r.stock_code,
                name: r.stock_name ?? '',
                strategies: etfMap[r.stock_code] ?? [],
                header: formatEquityHeader(r, tier),
            })),
        [rows, etfMap, tier],
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
                showJumpDots={slides.length <= MAX_JUMP_DOT_ROWS}
                renderHeaderExtra={(slide) =>
                    slide.header && <span className="text-xs text-gray-500 dark:text-gray-400">{slide.header}</span>
                }
                renderSlide={(slide) => <LazyBareKSlide code={slide.code} name={slide.name} strategies={slide.strategies} />}
            />
        </div>
    );
}
