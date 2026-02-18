import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Flame, TrendingUp, Clock } from 'lucide-react';
import { getWinRateData, getHeatmapData } from '@/app/actions/revenueLabActions';
import { WinRateLab } from './WinRateLab';
import { RevenueHeatmap } from './RevenueHeatmap';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const CURRENT_YEAR = 2025;

/**
 * Revenue Lab 整合容器（Server Component）
 * 預取初始資料後傳入各子模組
 */
export async function RevenueLab() {
  const [winRateData, heatmapData] = await Promise.all([
    getWinRateData(CURRENT_YEAR),
    getHeatmapData(CURRENT_YEAR),
  ]);

  const updatedAt = winRateData?.generatedAt
    ? new Date(winRateData.generatedAt).toLocaleDateString('zh-TW')
    : '—';

  return (
    <div className="space-y-6">
      {/* 頁首說明卡 */}
      <Card className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border-indigo-500/20 text-white overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none" />
        <CardContent className="p-6 relative">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-5 h-5 text-indigo-400" />
                <h2 className="text-xl font-bold">Revenue Lab</h2>
                <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-xs">
                  Beta
                </Badge>
              </div>
              <p className="text-slate-300 text-sm max-w-xl leading-relaxed">
                基於 FinLab 歷史資料的量化回測工具。驗證「黃金成長區間（YOY 50-100%）」策略的
                歷史有效性，並探索營收爆發與股價表現的關聯。
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              <span>資料更新：{updatedAt}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-5">
            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-1.5 text-indigo-300 mb-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold">勝率回測</span>
              </div>
              <p className="text-xs text-slate-400">分析不同爆發次數對應的歷史勝率與平均報酬</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-1.5 text-amber-300 mb-1">
                <Flame className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold">熱力圖分析</span>
              </div>
              <p className="text-xs text-slate-400">視覺化不同股價漲幅區間的月度 YOY 分佈特徵</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-1.5 text-emerald-300 mb-1">
                <BarChart3 className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold">資料來源</span>
              </div>
              <p className="text-xs text-slate-400">ETF 持股宇宙（53 檔）× Supabase 即時查詢，每小時更新快取</p>
            </div>
          </div>
        </CardContent>
      </Card>

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
          <WinRateLab initialData={winRateData} initialYear={CURRENT_YEAR} />
        </TabsContent>

        <TabsContent value="heatmap" className="mt-6">
          <RevenueHeatmap initialData={heatmapData} initialYear={CURRENT_YEAR} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
