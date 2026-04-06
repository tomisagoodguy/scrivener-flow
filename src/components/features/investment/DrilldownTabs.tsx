'use client';

import React, { useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DrilldownTabsProps {
    holdingsContent: React.ReactNode;
    ledgerContent: React.ReactNode;
}

const VALID_TABS = ['holdings', 'ledger'] as const;

export function DrilldownTabs({ holdingsContent, ledgerContent }: DrilldownTabsProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const activeTab = useMemo(() => {
        const tab = searchParams.get('tab');
        return tab && (VALID_TABS as readonly string[]).includes(tab) ? tab : 'holdings';
    }, [searchParams]);

    const handleTabChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', value);
        router.push(`?${params.toString()}`, { scroll: false });
    };

    return (
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-xs mb-8 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <TabsTrigger
                    value="holdings"
                    className="rounded-lg py-2 transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm"
                >
                    持股明細
                </TabsTrigger>
                <TabsTrigger
                    value="ledger"
                    className="rounded-lg py-2 transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm"
                >
                    異動紀錄
                </TabsTrigger>
            </TabsList>

            <TabsContent value="holdings">{holdingsContent}</TabsContent>
            <TabsContent value="ledger">{ledgerContent}</TabsContent>
        </Tabs>
    );
}
