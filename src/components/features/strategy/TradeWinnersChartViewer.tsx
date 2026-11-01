'use client';

import { useMemo } from 'react';
import { ScrollChartViewer } from '@/components/features/investment/ScrollChartViewer';
import { LazyBareKSlide } from '@/components/features/investment/pool/LazyBareKSlide';
import {
    formatReturnPct,
    holdingDays,
    holdingMarksFromTrades,
    rankWinnerStocks,
    returnColorClass,
} from '@/lib/investment/strategyTradeUtils';
import type { StrategyHoldingMarks, StrategyTrade, WinnerStock } from '@/lib/investment/strategyTradeUtils';

interface Props {
    /** 已依策略切換過濾的 trades */
    trades: StrategyTrade[];
    /** 「全部」模式才傳：標頭列策略簡稱 */
    strategyShortLabels?: Record<string, string>;
    /** 策略切換改變時重掛載，回到第 1 檔 */
    resetKey: string;
    /** 返回鍵：切回列表模式 */
    onBack: () => void;
}

interface WinnerSlide {
    code: string;
    name: string;
    winner: WinnerStock;
    labels: string[];
    holdingMarks: StrategyHoldingMarks | undefined;
}

function SlideHeader({ slide }: { slide: WinnerSlide }) {
    const { best } = slide.winner;
    const days = holdingDays(best);
    return (
        <span className="flex flex-wrap items-center gap-x-2 text-xs text-gray-500 dark:text-gray-400">
            <span className={`font-medium tabular-nums ${returnColorClass(best.holdingReturn)}`}>
                {formatReturnPct(best.holdingReturn)}
            </span>
            {days !== null && <span>{days} 天</span>}
            {slide.labels.length > 0 && <span>{slide.labels.join(' · ')}</span>}
        </span>
    );
}

/** 換股後表現的圖表模式：正報酬持有股依報酬遞減的連續捲動裸K圖，快照按需載入。 */
export default function TradeWinnersChartViewer({ trades, strategyShortLabels, resetKey, onBack }: Props) {
    const slides = useMemo<WinnerSlide[]>(() => {
        const marks = holdingMarksFromTrades(trades);
        return rankWinnerStocks(trades).map((winner) => ({
            code: winner.stockId,
            name: winner.name || winner.stockId,
            winner,
            labels: strategyShortLabels ? winner.strategyIds.map((id) => strategyShortLabels[id] ?? id) : [],
            holdingMarks: marks[winner.stockId],
        }));
    }, [trades, strategyShortLabels]);

    if (slides.length === 0) {
        return <p className="text-xs text-gray-400">目前無正報酬持有股</p>;
    }

    return (
        // pt-6 抵銷捲動子導覽列的 -mt-6，不壓到上方的摘要
        <div className="pt-6">
            <ScrollChartViewer
                key={resetKey}
                slides={slides}
                initialIndex={0}
                onBack={onBack}
                backLabel="返回列表"
                // 正報酬股可能數十檔，跳轉點會超出畫面，改靠子導覽列的上一檔／下一檔
                showJumpDots={false}
                renderHeaderExtra={(slide) => <SlideHeader slide={slide} />}
                renderSlide={(slide) => (
                    <LazyBareKSlide
                        code={slide.code}
                        name={slide.name}
                        strategies={slide.labels}
                        holdingMarks={slide.holdingMarks}
                    />
                )}
            />
        </div>
    );
}
