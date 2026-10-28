'use client';

import { ScrollChartViewer } from '@/components/features/investment/ScrollChartViewer';
import { LazyBareKSlide } from './LazyBareKSlide';
import type { PoolChartRow } from '@/lib/investment/poolChartUtils';

interface Props {
    rows: PoolChartRow[];
}

/** 選股池全部成分股的連續捲動裸K圖；快照由各段 LazyBareKSlide 按需載入。 */
export function PoolChartViewer({ rows }: Props) {
    if (rows.length === 0) {
        return <p className="text-sm text-gray-500 dark:text-gray-400">目前沒有選股池股票</p>;
    }

    return (
        // pt-6 抵銷捲動子導覽列的 -mt-6，不壓到上方的標題列
        <div className="pt-6">
            <ScrollChartViewer
                slides={rows}
                initialIndex={0}
                backHref="/investment"
                // 上百檔的跳轉點會超出畫面而無法點擊，改靠子導覽列的上一檔／下一檔
                showJumpDots={false}
                renderHeaderExtra={(row) => (
                    <span className="text-xs text-gray-500 dark:text-gray-400">{row.etfs.length} 支 ETF 持有</span>
                )}
                renderSlide={(row) => <LazyBareKSlide code={row.code} name={row.name} strategies={row.etfs} />}
            />
        </div>
    );
}
