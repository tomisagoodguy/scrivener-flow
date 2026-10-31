'use client';

import Link from 'next/link';
import { BareKChart } from './BareKChart';
import type { BareKSnapshot } from '@/app/api/investment/bare-k/[code]/route';
import type { StrategyHoldingMarks } from '@/lib/investment/strategyTradeUtils';

interface Props {
    code: string;
    name: string;
    strategies: string[];
    snapshot: BareKSnapshot | null;
    isOwner?: boolean;
    noSnapshotMessage?: string;
    markerDates?: readonly string[];
    /** 策略選股日／買進日標記與持有期間背景（只有策略圖表視角傳入） */
    holdingMarks?: StrategyHoldingMarks;
}

/** 捲動檢視器中一格的裸K內容：有快照畫六面板圖，無快照顯示佔位卡。 */
export function BareKSlideContent({ code, name, strategies, snapshot, isOwner = false, noSnapshotMessage, markerDates, holdingMarks }: Props) {
    if (snapshot) {
        return (
            <div className="glass-card rounded-2xl p-4">
                <BareKChart snapshot={snapshot} stockName={name} strategies={strategies} markerDates={markerDates} holdingMarks={holdingMarks} />
            </div>
        );
    }

    return (
        <div className="glass-card rounded-2xl p-10 text-center">
            <p className="text-gray-500 font-medium mb-1">{noSnapshotMessage ?? `${code} 的裸K資料尚未同步`}</p>
            {isOwner && !noSnapshotMessage && (
                <p className="text-sm text-gray-400">
                    請確認已在
                    <Link href="/investment/watch-list" className="text-blue-500 hover:underline mx-1">
                        自選股管理
                    </Link>
                    加入此股票
                </p>
            )}
        </div>
    );
}
