'use client';

import React, { useState, useTransition, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getHeatmapData } from '@/app/actions/revenueLabActions';
import type { HeatmapYearData, HeatmapStatMode, HeatmapCell } from '@/types/revenuelab';
import { REVENUE_HEATMAP_YEARS } from '@/lib/investment/yearUtils';
import { HeatmapCellContent } from './heatmap/HeatmapCell';
import { ColorLegend } from './heatmap/ColorLegend';
import { formatMonth } from './heatmap/heatmapUtils';

const AVAILABLE_YEARS = REVENUE_HEATMAP_YEARS;

const STAT_MODES: { value: HeatmapStatMode; label: string }[] = [
    { value: 'median', label: '中位數 YOY' },
    { value: 'mean', label: '平均值 YOY' },
    { value: 'stdDev', label: '標準差' },
    { value: 'positiveRate', label: '正增長比例' },
];

interface RevenueHeatmapProps {
    initialData: HeatmapYearData | null;
    initialYear?: number;
}

export function RevenueHeatmap({ initialData, initialYear = 2024 }: RevenueHeatmapProps) {
    const [year, setYear] = useState(initialYear);
    const [data, setData] = useState<HeatmapYearData | null>(initialData);
    const [mode, setMode] = useState<HeatmapStatMode>('median');
    const [isPending, startTransition] = useTransition();

    const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const y = Number(e.target.value);
        setYear(y);
        startTransition(async () => {
            const newData = await getHeatmapData(y);
            setData(newData);
        });
    };

    const cellMap = useMemo(() => {
        if (!data) return new Map<string, HeatmapCell>();
        return new Map(data.cells.map((c) => [`${c.binId}::${c.month}`, c]));
    }, [data]);

    if (!data) {
        return (
            <Card className="p-8 text-center text-slate-400">
                <p>暫無資料，請先執行 Python 資料腳本更新資料。</p>
            </Card>
        );
    }

    const sortedBins = [...data.returnBins].sort((a, b) => b.order - a.order);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* 控制列 */}
            <div className="flex flex-wrap items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">分析年度</span>
                    <select
                        value={year}
                        onChange={handleYearChange}
                        disabled={isPending}
                        className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        {AVAILABLE_YEARS.map((y) => (
                            <option key={y} value={y}>{y} 年</option>
                        ))}
                    </select>
                </div>

                {/* 統計模式切換 */}
                <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
                    {STAT_MODES.map((m) => (
                        <button
                            key={m.value}
                            onClick={() => setMode(m.value)}
                            className={`px-3 py-1.5 text-xs rounded-md transition-all ${
                                mode === m.value
                                    ? 'bg-white dark:bg-slate-600 shadow-sm font-semibold text-slate-900 dark:text-white'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>

                {isPending && <span className="text-xs text-slate-400 animate-pulse">載入中...</span>}
            </div>

            {/* 熱力圖主體 */}
            <Card>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                            <CardTitle className="text-base">營收 YOY × 股價漲幅 熱力圖</CardTitle>
                            <CardDescription>
                                {year} 年各股價漲幅區間的月度 YOY 分佈（{STAT_MODES.find((m) => m.value === mode)?.label}）
                            </CardDescription>
                        </div>
                        <ColorLegend mode={mode} />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <div
                            className="grid gap-0.5"
                            style={{
                                gridTemplateColumns: `140px repeat(${data.months.length}, minmax(52px, 1fr))`,
                                minWidth: `${140 + data.months.length * 52}px`,
                            }}
                        >
                            {/* 表頭 */}
                            <div className="py-2 px-2 text-xs font-semibold text-slate-500 flex items-end">股價漲幅區間</div>
                            {data.months.map((m) => (
                                <div key={m} className="py-2 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
                                    {formatMonth(m)}
                                </div>
                            ))}

                            {/* 資料列 */}
                            {sortedBins.map((bin) => (
                                <React.Fragment key={bin.id}>
                                    <div
                                        className={`py-2 px-2 text-xs font-medium flex items-center rounded-l-md ${
                                            bin.avgAnnualReturn >= 0
                                                ? 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20'
                                                : 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                                        }`}
                                    >
                                        <span className="truncate">{bin.label}</span>
                                        <span className="ml-1 text-[10px] opacity-60">({bin.stockCount})</span>
                                    </div>

                                    {data.months.map((month) => {
                                        const cell = cellMap.get(`${bin.id}::${month}`);
                                        if (!cell) {
                                            return (
                                                <div key={month} className="py-2 text-center text-xs text-slate-300 dark:text-slate-600 bg-slate-50 dark:bg-slate-800/30">
                                                    —
                                                </div>
                                            );
                                        }
                                        return <HeatmapCellContent key={month} cell={cell} bin={bin} mode={mode} />;
                                    })}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <p className="text-xs text-slate-400 text-center">
                Y 軸：股票年度股價漲幅區間（括號內為股票數）｜X 軸：月份 YOY 統計值｜顏色越深代表數值越高
            </p>

            {/* 2024 黃金成長與極端成長區間展示 */}
            {year === 2024 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                    {/* 黃金成長區間 (50-100%) */}
                    <div className="rounded-xl border text-card-foreground shadow border-indigo-200 dark:border-indigo-900 bg-indigo-50/30 dark:bg-indigo-950/20">
                        <div className="flex flex-col space-y-1.5 p-6 pb-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg text-indigo-600 dark:text-indigo-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-crosshair w-5 h-5" aria-hidden="true">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <line x1="22" x2="18" y1="12" y2="12"></line>
                                            <line x1="6" x2="2" y1="12" y2="12"></line>
                                            <line x1="12" x2="12" y1="6" y2="2"></line>
                                            <line x1="12" x2="12" y1="22" y2="18"></line>
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="tracking-tight text-lg font-bold text-slate-900 dark:text-white">黃金成長區間 (50-100%)</h3>
                                        <p className="text-sm text-muted-foreground">目前命中標的共 10 檔，佔比 23.94%</p>
                                    </div>
                                </div>
                                <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent hover:bg-secondary/80 bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">首選標的</div>
                            </div>
                        </div>
                        <div className="p-6 pt-0">
                            <div className="space-y-3">
                                {[
                                    { code: '2383', name: '台光電', industry: '電子零組件業', weight: '6.55%', yoy: '+55.5%' },
                                    { code: '2345', name: '智邦', industry: '通信網路業', weight: '6.28%', yoy: '+71.9%' },
                                    { code: '6274', name: '台燿', industry: '電子零組件業', weight: '4.36%', yoy: '+74.8%' },
                                    { code: '2368', name: '金像電', industry: '電子零組件業', weight: '3.95%', yoy: '+68.5%' },
                                    { code: '6139', name: '亞翔', industry: '其他電子業', weight: '1.42%', yoy: '+87.6%' },
                                    { code: '6191', name: '精成科', industry: '電子零組件業', weight: '0.57%', yoy: '+93.4%' },
                                    { code: '5269', name: '祥碩', industry: '半導體業', weight: '0.29%', yoy: '+58.3%' },
                                    { code: '3211', name: '順達', industry: '電腦及週邊設備業', weight: '0.27%', yoy: '+52.2%' },
                                    { code: '2404', name: '漢唐', industry: '其他電子業', weight: '0.25%', yoy: '+58.9%' },
                                    { code: '2357', name: '華碩', industry: '電腦及週邊設備業', weight: '0%', yoy: '+80.0%' },
                                ].map((stock) => (
                                    <a
                                        key={stock.code}
                                        href={`/investment/stock/${stock.code}?sort=weight&order=desc`}
                                        className="group flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-indigo-900/50 shadow-sm hover:shadow-md transition-all hover:border-indigo-300 dark:hover:border-indigo-700 active:scale-[0.99]"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/50 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                                {stock.code}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                    {stock.name}
                                                </div>
                                                <div className="text-xs text-slate-500 flex items-center gap-1">
                                                    <span>{stock.industry}</span>
                                                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                    <span>權重 {stock.weight}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{stock.yoy}</div>
                                            <div className="text-xs text-slate-400">YoY</div>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 極端成長區間 (>100%) */}
                    <div className="rounded-xl border bg-card text-card-foreground shadow border-slate-200 dark:border-slate-800">
                        <div className="flex flex-col space-y-1.5 p-6 pb-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg text-rose-600 dark:text-rose-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-triangle-alert w-5 h-5" aria-hidden="true">
                                            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"></path>
                                            <path d="M12 9v4"></path>
                                            <path d="M12 17h.01"></path>
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="tracking-tight text-lg font-bold text-slate-900 dark:text-white">極端成長區間 (&gt;100%)</h3>
                                        <p className="text-sm text-muted-foreground">目前命中標的共 6 檔，佔比 21.05%</p>
                                    </div>
                                </div>
                                <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-rose-600 border-rose-200 dark:border-rose-900">波動風險較高</div>
                            </div>
                        </div>
                        <div className="p-6 pt-0">
                            <div className="space-y-3">
                                {[
                                    { code: '3017', name: '奇鋐', industry: '電腦及週邊設備業', weight: '6.23%', yoy: '+150.0%' },
                                    { code: '8299', name: '群聯', industry: '半導體業', weight: '4.94%', yoy: '+189.2%' },
                                    { code: '6669', name: '緯穎', industry: '電腦及週邊設備業', weight: '4.57%', yoy: '+121.9%' },
                                    { code: '6805', name: '富世達', industry: '電子零組件業', weight: '2.79%', yoy: '+115.8%' },
                                    { code: '8210', name: '勤誠', industry: '電腦及週邊設備業', weight: '2.52%', yoy: '+137.0%' },
                                    { code: '8996', name: '高力', industry: '電機機械', weight: '0%', yoy: '+317.2%' },
                                ].map((stock) => (
                                    <a
                                        key={stock.code}
                                        href={`/investment/stock/${stock.code}?sort=weight&order=desc`}
                                        className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 opacity-90 hover:opacity-100 transition-opacity hover:border-rose-300 dark:hover:border-rose-700 active:scale-[0.99]"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-400">
                                                {stock.code}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-700 dark:text-slate-300">
                                                    {stock.name}
                                                </div>
                                                <div className="text-xs text-slate-500 flex items-center gap-1">
                                                    <span>{stock.industry}</span>
                                                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                    <span>權重 {stock.weight}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-bold text-rose-500 dark:text-rose-400">{stock.yoy}</div>
                                            <div className="text-xs text-slate-400">YoY</div>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
