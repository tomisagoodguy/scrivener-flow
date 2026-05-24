'use client';

import { BareKScrollViewer } from '@/components/features/investment/BareKScrollViewer';
import type { StockSlide } from '@/components/features/investment/BareKScrollViewer';
import type { StrategyMonitorStock } from '@/components/features/strategy/StrategyMonitorCard';
import type { BareKSnapshot } from '@/app/api/investment/bare-k/[code]/route';

interface Props {
    stocks: StrategyMonitorStock[];
    snapshots: Map<string, BareKSnapshot | null>;
}

export function StrategyChartViewer({ stocks, snapshots }: Props) {
    const slides: StockSlide[] = stocks.map((s) => ({
        code: s.stock_id,
        name: s.name ?? '',
        strategies: s.strategies,
        snapshot: snapshots.get(s.stock_id) ?? null,
    }));

    return (
        <BareKScrollViewer
            slides={slides}
            initialIndex={0}
            isOwner={false}
            backHref="/investment/strategy"
            noSnapshotMessage="此股票尚未同步裸K資料，將於今日 Pipeline 執行後更新"
            disableHistoryUpdate
        />
    );
}
