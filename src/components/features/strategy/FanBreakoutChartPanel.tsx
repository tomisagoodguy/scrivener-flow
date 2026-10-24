'use client';

import type { FanBreakoutRow } from '@/lib/investment/fanBreakout';
import FanBreakoutSlideChart from './FanBreakoutSlideChart';

const NAV_BTN = 'px-3 py-1 text-sm rounded-lg bg-gray-100/70 dark:bg-gray-800/50';

interface Props {
    row: FanBreakoutRow;
    onPrev: () => void;
    onNext: () => void;
}

export default function FanBreakoutChartPanel({ row, onPrev, onNext }: Props) {
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
            <FanBreakoutSlideChart row={row} />
        </div>
    );
}
