import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Flame, TrendingUp, Clock } from 'lucide-react';
import { getWinRateData, getHeatmapData } from '@/app/actions/revenueLabActions';
import { WinRateLab } from './WinRateLab';
import { RevenueHeatmap } from './RevenueHeatmap';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Holding } from '@/types/investment';

const CURRENT_YEAR = 2025;

/**
 * Revenue Lab 整合容器（Server Component）
 * 預取初始資料後傳入各子模組
 */
export async function RevenueLab({ currentHoldings }: { currentHoldings?: Holding[] }) {
  const [winRateData, heatmapData] = await Promise.all([
    getWinRateData(CURRENT_YEAR),
    getHeatmapData(CURRENT_YEAR),
  ]);

  return (
    <div className="space-y-4">

      {/* 子模組 Tabs */}
      <Tabs defaultValue="win-rate">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="win-rate" className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4" />
            勝率回測 Lab
          </TabsTrigger>
          <TabsTrigger value="heatmap" className="flex items-center gap-1.5">
            <Flame className="w-4 h-4" />
            營收熱力圖
          </TabsTrigger>
        </TabsList>

        <TabsContent value="win-rate" className="mt-6">
          <WinRateLab 
            initialData={winRateData} 
            initialYear={CURRENT_YEAR} 
            currentStockCodes={currentHoldings?.map(h => h.stock_code)}
          />
        </TabsContent>

        <TabsContent value="heatmap" className="mt-6">
          <RevenueHeatmap initialData={heatmapData} initialYear={CURRENT_YEAR} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
