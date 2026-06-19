import React from 'react';
import { EtfOverviewStat } from '@/lib/investment/etfOverviewStats';
import { EtfOverviewCard } from '@/components/features/investment/EtfOverviewCard';

export interface EtfOverviewGridProps {
    stats: EtfOverviewStat[];
}

/**
 * Card ordering：揭露日等於全局最新者在前，同組內 AUM 降冪，null AUM 排同組最後。
 * 不變更輸入陣列。
 */
export function sortOverviewStats(stats: EtfOverviewStat[]): EtfOverviewStat[] {
    const maxDate = stats.reduce<string | null>(
        (max, s) => (s.dataDate && (!max || s.dataDate > max) ? s.dataDate : max),
        null,
    );

    return [...stats].sort((a, b) => {
        const aFresh = a.dataDate === maxDate ? 0 : 1;
        const bFresh = b.dataDate === maxDate ? 0 : 1;
        if (aFresh !== bFresh) return aFresh - bFresh;

        if (a.aum100m === null && b.aum100m === null) return 0;
        if (a.aum100m === null) return 1;
        if (b.aum100m === null) return -1;
        return b.aum100m - a.aum100m;
    });
}

export function EtfOverviewGrid({ stats }: EtfOverviewGridProps) {
    // 隱藏無資料的 ETF（holdingsCount === 0 / dataDate === null），不顯示空卡片。
    const sorted = sortOverviewStats(stats.filter(s => s.holdingsCount > 0));
    const maxDate = sorted[0]?.dataDate ?? null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sorted.map(stat => (
                <EtfOverviewCard
                    key={stat.code}
                    stat={stat}
                    isStale={stat.dataDate === null || stat.dataDate !== maxDate}
                />
            ))}
        </div>
    );
}
