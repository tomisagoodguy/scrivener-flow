'use client';

import React, { useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface InvestmentTabsProps {
    stockPickerContent: React.ReactNode;
    analysisContent: React.ReactNode;
    ledgerContent: React.ReactNode;
    compareContent: React.ReactNode;
    consensusContent: React.ReactNode;
    flowContent: React.ReactNode;
}

const VALID_TABS = ['stock-picker', 'analysis', 'ledger', 'compare', 'consensus', 'flow'] as const;

export function InvestmentTabs({
    stockPickerContent,
    analysisContent,
    ledgerContent,
    compareContent,
    consensusContent,
    flowContent,
}: InvestmentTabsProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const activeTab = useMemo(() => {
        const tab = searchParams.get('tab');
        return tab && (VALID_TABS as readonly string[]).includes(tab) ? tab : 'stock-picker';
    }, [searchParams]);

    React.useEffect(() => {
        const handleHashScroll = () => {
            const hash = window.location.hash;
            if (hash && hash.startsWith('#stock-')) {
                const timer = setTimeout(() => {
                    const id = hash.substring(1);
                    const element = document.getElementById(id);

                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
                        element.classList.add('ring-4', 'ring-indigo-500', 'ring-offset-4', 'dark:ring-indigo-400', 'shadow-2xl', 'scale-[1.02]', 'z-10', 'transition-all', 'duration-500');
                        setTimeout(() => {
                            element.classList.remove('ring-4', 'ring-indigo-500', 'ring-offset-4', 'shadow-2xl', 'scale-[1.02]', 'z-10');
                        }, 3000);
                    }
                }, 600);
                return () => clearTimeout(timer);
            }
        };

        handleHashScroll();
        window.addEventListener('hashchange', handleHashScroll);
        return () => window.removeEventListener('hashchange', handleHashScroll);
    }, [activeTab]);

    const handleTabChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', value);
        const hash = window.location.hash;
        router.push(`?${params.toString()}${hash}`, { scroll: false });
    };

    const triggerClass = "rounded-lg py-2 transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm";

    return (
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-6 max-w-4xl mb-8 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <TabsTrigger value="stock-picker" className={triggerClass}>🎯 選股池</TabsTrigger>
                <TabsTrigger value="analysis" className={triggerClass}>策略分析</TabsTrigger>
                <TabsTrigger value="ledger" className={triggerClass}>異動紀錄</TabsTrigger>
                <TabsTrigger value="compare" className={triggerClass}>ETF 對比</TabsTrigger>
                <TabsTrigger value="consensus" className={triggerClass}>共識持股</TabsTrigger>
                <TabsTrigger value="flow" className={triggerClass}>資金流向</TabsTrigger>
            </TabsList>

            <TabsContent value="stock-picker">{stockPickerContent}</TabsContent>
            <TabsContent value="analysis">{analysisContent}</TabsContent>
            <TabsContent value="ledger">{ledgerContent}</TabsContent>
            <TabsContent value="compare">{compareContent}</TabsContent>
            <TabsContent value="consensus">{consensusContent}</TabsContent>
            <TabsContent value="flow">{flowContent}</TabsContent>
        </Tabs>
    );
}
