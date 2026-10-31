'use client';

import { ScrollChartViewer } from '@/components/features/investment/ScrollChartViewer';
import { LazyBareKSlide } from '@/components/features/investment/pool/LazyBareKSlide';
import { buildConsensusHref, formatMonthDay, shortStrategyLabel } from '@/lib/investment/strategyConsensusUtils';
import type { ConsensusParams, MultiConsensusEntry } from '@/lib/investment/strategyConsensusUtils';

interface Props {
    /** 已排序的共選股（與列表模式同一份） */
    stocks: MultiConsensusEntry[];
    params: ConsensusParams;
}

interface ConsensusSlide {
    code: string;
    name: string;
    labels: string[];
    entry: MultiConsensusEntry;
}

function SlideHeader({ slide, isLatest }: { slide: ConsensusSlide; isLatest: boolean }) {
    const { entry, labels } = slide;
    return (
        <span className="flex flex-wrap items-center gap-x-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium text-gray-700 dark:text-gray-200">{entry.count} 策略共選</span>
            <span>{labels.join(' · ')}</span>
            {!isLatest && entry.lastDate && <span>最後 {formatMonthDay(entry.lastDate)}</span>}
        </span>
    );
}

/** 多策略共選股的連續捲動裸K圖；快照由各段 LazyBareKSlide 按需載入。 */
export default function ConsensusChartViewer({ stocks, params }: Props) {
    if (stocks.length === 0) {
        return <p className="text-xs text-gray-400">目前條件下無共選股</p>;
    }

    const isLatest = params.window === 'latest';
    const slides: ConsensusSlide[] = stocks.map((entry) => ({
        code: entry.stock_id,
        name: entry.name || entry.stock_id,
        labels: entry.strategies.map((s) => shortStrategyLabel(s.label)),
        entry,
    }));

    return (
        // pt-6 抵銷捲動子導覽列的 -mt-6，不壓到上方的共選面板
        <div className="pt-6">
            <ScrollChartViewer
                // 門檻／時間窗改變時重掛載，回到第 1 檔（連結 scroll={false} 不會重建元件）
                key={buildConsensusHref(params)}
                slides={slides}
                initialIndex={0}
                backHref={buildConsensusHref({ ...params, view: 'list' })}
                // 共選股可能數十檔，跳轉點會超出畫面，改靠子導覽列的上一檔／下一檔
                showJumpDots={false}
                renderHeaderExtra={(slide) => <SlideHeader slide={slide} isLatest={isLatest} />}
                renderSlide={(slide) => <LazyBareKSlide code={slide.code} name={slide.name} strategies={slide.labels} />}
            />
        </div>
    );
}
