'use client';

import { TabsList, TabsTrigger } from '@/components/ui/tabs';

export const VALID_TABS = ['holdings', 'today', 'history', 'entry', 'pnl', 'exited', 'ledger', 'stock-trade', 'mechanics'] as const;
export type TabId = typeof VALID_TABS[number];

export const TAB_LABELS: Record<TabId, string> = {
    holdings:      '目前持股',
    today:         '當日加減碼',
    history:       '歷史軌跡',
    entry:         '單股進出場',
    pnl:           '損益排行',
    exited:        '已出清',
    ledger:        '異動紀錄',
    'stock-trade': '📈 損益追蹤',
    mechanics:     '市場機制',
};

const triggerClass = 'rounded-lg py-1.5 px-2 text-xs transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm';

export function DrilldownTabBar() {
    return (
        <TabsList className="flex flex-wrap gap-1 mb-6 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
            {VALID_TABS.map(tab => (
                <TabsTrigger key={tab} value={tab} className={triggerClass}>
                    {TAB_LABELS[tab]}
                </TabsTrigger>
            ))}
        </TabsList>
    );
}
