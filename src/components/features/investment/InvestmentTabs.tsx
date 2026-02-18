'use client';

import React, { useEffect, useState } from 'react';
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
  const [activeTab, setActiveTab] = useState<string>('analysis');

  // 監控 Hash 變化並在 Tab 切換後手動捲動
  useEffect(() => {
    const handleHashScroll = () => {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#stock-')) {
        const tab = searchParams.get('tab') || 'analysis';
        
        // 如果目前不在目標分頁，先切換 (activeTab 會觸發下一次 useEffect)
        if (tab !== activeTab) {
          setActiveTab(tab);
          return;
        }

        // 確保分頁內容已加載並完成動畫
        const timer = setTimeout(() => {
          const id = hash.substring(1);
          const element = document.getElementById(id);
          
          if (element) {
            // 捲動定位：確保置中並稍微靠上，減少 Header 遮擋風險
            element.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest'
            });

            // 強化高亮效果：使用更醒目的邊框與陰影脈衝
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
    
    // 監聽 hashchange 事件
    window.addEventListener('hashchange', handleHashScroll);
    return () => window.removeEventListener('hashchange', handleHashScroll);
  }, [activeTab, searchParams]);

  // 初始化與同步 URL 參數
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['analysis', 'revenue-lab', 'holdings', 'ledger'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    // 保留 hash
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
