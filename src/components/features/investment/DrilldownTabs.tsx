'use client';

import React, { useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { DrilldownTabBar, VALID_TABS, type TabId } from './drilldown/DrilldownTabBar';
import { TodayDiffSummary } from './drilldown/TodayDiffSummary';
import { PositionsTab, ExitedSummary, EmptyState } from './drilldown/PositionsTab';
import { HistoryTab } from './drilldown/HistoryTab';
import type { PositionRow, DiffLogRow } from './drilldown/types';
import type { RankingDataRow } from './RankingTrendChart';

interface DrilldownTabsProps {
    holdingsContent: React.ReactNode;
    ledgerContent: React.ReactNode;
    stockTradeContent?: React.ReactNode;
    mechanicsContent?: React.ReactNode;
    todayDiffs?: DiffLogRow[];
    todayBuyChartContent?: React.ReactNode;
    positions?: PositionRow[];
    historyData?: RankingDataRow[];
    dataDate?: string;
    prevDate?: string;
}

export function DrilldownTabs({
    holdingsContent,
    ledgerContent,
    stockTradeContent,
    mechanicsContent,
    todayDiffs = [],
    todayBuyChartContent,
    positions = [],
    historyData,
    dataDate,
    prevDate,
}: DrilldownTabsProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const activeTab = useMemo<TabId>(() => {
        const tab = searchParams.get('tab') as TabId | null;
        return tab && (VALID_TABS as readonly string[]).includes(tab) ? tab : 'holdings';
    }, [searchParams]);

    const handleTabChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', value);
        router.push(`?${params.toString()}`, { scroll: false });
    };

    return (
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <DrilldownTabBar />
            <TabsContent value="holdings">{holdingsContent}</TabsContent>
            <TabsContent value="today">
                <div className="space-y-6">
                    {todayBuyChartContent}
                    <TodayDiffSummary diffs={todayDiffs} dataDate={dataDate} prevDate={prevDate} />
                </div>
            </TabsContent>
            <TabsContent value="history">
                <HistoryTab historyData={historyData} />
            </TabsContent>
            <TabsContent value="entry">
                <PositionsTab positions={positions} activeOnly={true} />
            </TabsContent>
            <TabsContent value="pnl">
                <PositionsTab positions={[...positions].sort((a, b) => b.pnl_pct - a.pnl_pct)} />
            </TabsContent>
            <TabsContent value="exited">
                <ExitedSummary positions={positions} />
                <PositionsTab positions={positions} activeOnly={false} />
            </TabsContent>
            <TabsContent value="ledger">{ledgerContent}</TabsContent>
            <TabsContent value="stock-trade">
                {stockTradeContent ?? <EmptyState message="損益追蹤資料載入中" />}
            </TabsContent>
            <TabsContent value="mechanics">
                {mechanicsContent ?? <EmptyState message="市場機制資料載入中" />}
            </TabsContent>
        </Tabs>
    );
}
