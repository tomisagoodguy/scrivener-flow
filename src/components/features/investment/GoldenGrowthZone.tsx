"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Holding } from '@/types/investment';
import { TrendingUp, ShieldCheck, Zap, AlertTriangle, Crosshair } from 'lucide-react';

interface GoldenGrowthZoneProps {
    data: Holding[];
}

/**
 * 黃金成長區間分析 (Golden Growth Zone Analysis)
 * 根據用戶論文研究：YOY 50-100% 區間勝率最高，兼具爆發力與抗跌性。
 */
export function GoldenGrowthZone({ data }: GoldenGrowthZoneProps) {
    // 1. 篩選數據
    // 黃金區間: 50% <= YoY <= 100%
    const goldenZoneStocks = data.filter(h => (h.revenue_yoy ?? 0) >= 50 && (h.revenue_yoy ?? 0) <= 100);
    
    // 爆發區間: YoY > 100%
    const explosiveZoneStocks = data.filter(h => (h.revenue_yoy ?? 0) > 100);

    // 計算總權重佔比
    const goldenWeight = goldenZoneStocks.reduce((acc, curr) => acc + (curr.weight ?? 0), 0);
    const explosiveWeight = explosiveZoneStocks.reduce((acc, curr) => acc + (curr.weight ?? 0), 0);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* 策略論述卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="md:col-span-3 bg-white dark:bg-linear-to-br dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-slate-200 dark:border-indigo-500/20 shadow-xl overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                    <CardHeader>
                        <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-400/30 bg-amber-50 dark:bg-amber-400/10 px-3 py-1">
                                <Zap className="w-3 h-3 mr-1" />
                                核心策略
                            </Badge>
                            <span className="text-slate-500 dark:text-slate-400 text-xs font-mono">THESIS-00981</span>
                        </div>
                        <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            最佳成長甜蜜點 <span className="text-indigo-600 dark:text-indigo-400">YOY 50-100%</span>
                        </CardTitle>
                        <CardDescription className="text-slate-500 dark:text-slate-300 text-base leading-relaxed max-w-2xl">
                            根據歷史回測與學術研究，此區間標的展現出「質量成長股」的最佳特性：
                            在多頭行情中具備強勁爆發力，空頭行情中則展現優異抗跌性。
                            相較於 YoY &gt; 100% 的極端成長股，此區間報酬風險比更為穩定。
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                            <div className="bg-slate-50 dark:bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-slate-100 dark:border-white/10">
                                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
                                    <TrendingUp className="w-4 h-4" />
                                    <span className="font-bold text-sm">最高勝率</span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">長期觀察下表現最穩定</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-slate-100 dark:border-white/10">
                                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
                                    <Zap className="w-4 h-4" />
                                    <span className="font-bold text-sm">多頭爆發</span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">具備顯著超額報酬潛力</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-slate-100 dark:border-white/10">
                                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                                    <ShieldCheck className="w-4 h-4" />
                                    <span className="font-bold text-sm">空頭抗跌</span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">基本面支撐股價</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 黃金區間列表 */}
                <Card className="border-indigo-200 dark:border-indigo-900 bg-indigo-50/30 dark:bg-indigo-950/20">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg text-indigo-600 dark:text-indigo-400">
                                    <Crosshair className="w-5 h-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">黃金成長區間 (50-100%)</CardTitle>
                                    <CardDescription>目前命中標的共 {goldenZoneStocks.length} 檔，佔比 {goldenWeight.toFixed(2)}%</CardDescription>
                                </div>
                            </div>
                            <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                                首選標的
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {goldenZoneStocks.length > 0 ? (
                            <div className="space-y-3">
                                {goldenZoneStocks.map((stock) => (
                                    <div key={stock.stock_code} className="group flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-indigo-900/50 shadow-sm hover:shadow-md transition-all hover:border-indigo-300 dark:hover:border-indigo-700">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/50 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                                {stock.stock_code}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                    {stock.stock_name}
                                                </div>
                                                <div className="text-xs text-slate-500 flex items-center gap-1">
                                                    <span>{stock.industry}</span>
                                                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                    <span>權重 {stock.weight}%</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                                                +{stock.revenue_yoy?.toFixed(1)}%
                                            </div>
                                            <div className="text-xs text-slate-400">YoY</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-slate-400">
                                <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>目前無標的落於此區間</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* 極端成長區間列表 (>100%) */}
                <Card className="border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg text-rose-600 dark:text-rose-400">
                                    <AlertTriangle className="w-5 h-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">極端成長區間 (&gt;100%)</CardTitle>
                                    <CardDescription>目前命中標的共 {explosiveZoneStocks.length} 檔，佔比 {explosiveWeight.toFixed(2)}%</CardDescription>
                                </div>
                            </div>
                            <Badge variant="outline" className="text-rose-600 border-rose-200 dark:border-rose-900">
                                波動風險較高
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {explosiveZoneStocks.length > 0 ? (
                            <div className="space-y-3">
                                {explosiveZoneStocks.map((stock) => (
                                    <div key={stock.stock_code} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 opacity-90 hover:opacity-100 transition-opacity">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-400">
                                                {stock.stock_code}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-700 dark:text-slate-300">
                                                    {stock.stock_name}
                                                </div>
                                                <div className="text-xs text-slate-500 flex items-center gap-1">
                                                    <span>{stock.industry}</span>
                                                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                    <span>權重 {stock.weight}%</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-bold text-rose-500 dark:text-rose-400">
                                                +{stock.revenue_yoy?.toFixed(1)}%
                                            </div>
                                            <div className="text-xs text-slate-400">YoY</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-slate-400">
                                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <span className="text-xl">Pass</span>
                                </div>
                                <p>目前無標的落於此區間</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
