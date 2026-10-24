'use client';

import { useMemo } from 'react';
import { ScrollChartViewer, type ScrollSlide } from '@/components/features/investment/ScrollChartViewer';
import { FAN_BREAKOUT_SIGNAL_LABEL, formatSignedPct, type FanBreakoutRow } from '@/lib/investment/fanBreakout';
import FanBreakoutSlideChart from './FanBreakoutSlideChart';

const MUTED = 'text-gray-500 dark:text-gray-400';

interface Slide extends ScrollSlide {
    row: FanBreakoutRow;
}

/** 台股紅漲綠跌；0 與缺值為灰色 */
function returnClass(value: number | null): string {
    if (value !== null && value > 0) return 'text-rose-600 dark:text-rose-400';
    if (value !== null && value < 0) return 'text-emerald-600 dark:text-emerald-400';
    return MUTED;
}

/** 每格標題附加資訊：訊號日、spread、首次／再次、連續天數、訊號後報酬。缺值欄位不顯示（報酬顯示「—」）。 */
function SlideSummary({ row }: { row: FanBreakoutRow }) {
    return (
        <span className="flex items-center gap-2 flex-wrap text-xs">
            <span className={MUTED}>{row.date}</span>
            {row.spread !== null && (
                <span className="flex items-center gap-1">
                    <span className={MUTED}>發散</span>
                    <span className="text-gray-700 dark:text-gray-200">{formatSignedPct(row.spread)}</span>
                </span>
            )}
            {row.signalType && (
                <span className="px-1.5 py-0.5 rounded bg-gray-100/70 dark:bg-gray-800/50">
                    {FAN_BREAKOUT_SIGNAL_LABEL[row.signalType]}
                </span>
            )}
            {row.consecDays !== null && <span className={MUTED}>{`連續 ${row.consecDays} 天`}</span>}
            <span className="flex items-center gap-1">
                <span className={MUTED}>訊號後</span>
                <span className={returnClass(row.returnSinceSignal)}>
                    {row.returnSinceSignal === null ? '—' : formatSignedPct(row.returnSinceSignal)}
                </span>
            </span>
        </span>
    );
}

interface Props {
    rows: FanBreakoutRow[];
    initialIndex: number;
    onBack: () => void;
}

/** 均線發散候選的連續看圖：每股一格，K 線含 5 條均線與入選日標記。 */
export default function FanBreakoutContinuousView({ rows, initialIndex, onBack }: Props) {
    // memo：ScrollChartViewer 的 observer 依賴 slides 身分
    const slides = useMemo<Slide[]>(() => rows.map((row) => ({ code: row.stockId, name: row.name, row })), [rows]);

    return (
        // pt-2 + 外層 space-y-4 抵銷捲動子導覽列的 -mt-6，不壓到篩選卡片
        <div className="pt-2">
            <ScrollChartViewer
                slides={slides}
                initialIndex={initialIndex}
                onBack={onBack}
                backLabel="返回表格"
                renderHeaderExtra={(slide) => <SlideSummary row={slide.row} />}
                renderSlide={(slide) => (
                    // 預留 StockChart 高度（主圖 450 + RSI 標題 + RSI 120 + padding）：K 線是非同步載入，
                    // 不預留的話掛載當下頁面太矮，初始捲動到選取股票會失敗
                    <div className="glass-card rounded-2xl p-4 min-h-[630px]">
                        <FanBreakoutSlideChart row={slide.row} />
                    </div>
                )}
            />
        </div>
    );
}
