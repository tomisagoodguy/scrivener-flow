'use client';

import React, { useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface InvestmentTabsProps {
  analysisContent: React.ReactNode;
  revenueLabContent: React.ReactNode;
  holdingsContent: React.ReactNode;
  ledgerContent: React.ReactNode;
}

export function InvestmentTabs({
  analysisContent,
  revenueLabContent,
  holdingsContent,
  ledgerContent,
}: InvestmentTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 直接從 URL 衍生 activeTab，避免 useEffect + setState 引發的 cascading renders
  const activeTab = useMemo(() => {
    const tab = searchParams.get('tab');
    return tab && ['analysis', 'revenue-lab', 'holdings', 'ledger'].includes(tab) ? tab : 'analysis';
  }, [searchParams]);

  // 監控 Hash 變化並在 Tab 切換後手動捲動（此 effect 只與外部系統 DOM 互動，無 setState）
  React.useEffect(() => {
    const handleHashScroll = () => {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#stock-')) {
        // 確保分頁內容已加載並完成動畫
        const timer = setTimeout(() => {
          const id = hash.substring(1);
          const element = document.getElementById(id);

          if (element) {
            element.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest'
            });

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
    // 保留 hash；activeTab 由 URL 衍生，無需額外 setState
    const hash = window.location.hash;
    router.push(`?${params.toString()}${hash}`, { scroll: false });
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-4 max-w-[800px] mb-8 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
        <TabsTrigger
          value="analysis"
          className="rounded-lg py-2 transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm"
        >
          策略洞察
        </TabsTrigger>
        <TabsTrigger
          value="revenue-lab"
          className="rounded-lg py-2 transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm"
        >
          📊 Revenue Lab
        </TabsTrigger>
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

      <TabsContent value="analysis">{analysisContent}</TabsContent>
      <TabsContent value="revenue-lab">{revenueLabContent}</TabsContent>
      <TabsContent value="holdings">{holdingsContent}</TabsContent>
      <TabsContent value="ledger">{ledgerContent}</TabsContent>
    </Tabs>
  );
}
