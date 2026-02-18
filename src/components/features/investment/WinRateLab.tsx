'use client';

import React, { useState, useTransition } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Trophy, ChevronDown, ChevronUp, Users, Target, Zap } from 'lucide-react';
import { getWinRateData } from '@/app/actions/revenueLabActions';
import type { WinRateYearData, WinRateBucket } from '@/types/revenuelab';

// 目前僅支援 2025 年（stock_prices_daily 從 2025-06 起有資料）
const AVAILABLE_YEARS = [2025];

interface WinRateLabProps {
  initialData: WinRateYearData | null;
  initialYear?: number;
}

// ── 統計摘要卡片 ──────────────────────────────────────────

function MetricCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
      <CardContent className="p-4">
        <div className={`flex items-center gap-2 mb-2 ${color}`}>
          {icon}
          <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
        </div>
        <div className="text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
        {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

// ── 詳細名單 Accordion ────────────────────────────────────

function StockListAccordion({ bucket }: { bucket: WinRateBucket }) {
  const [open, setOpen] = useState(false);

  if (!bucket.stocks || bucket.stocks.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline mt-1"
      >
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        查看 {bucket.stocks.length} 檔股票名單
      </button>
      {open && (
        <div className="mt-2 space-y-1">
          {bucket.stocks.map((s) => (
            <div
              key={s.code}
              className="flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-slate-600 dark:text-slate-400">{s.code}</span>
                <span className="text-slate-700 dark:text-slate-300">{s.name}</span>
                <Badge variant="outline" className="text-[10px] py-0">
                  連爆 {s.burstMonths} 月
                </Badge>
              </div>
              <span className={`font-bold ${s.annualReturn >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                {s.annualReturn >= 0 ? '+' : ''}{s.annualReturn.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 主元件 ────────────────────────────────────────────────

export function WinRateLab({ initialData, initialYear = 2024 }: WinRateLabProps) {
  const [year, setYear] = useState(initialYear);
  const [data, setData] = useState<WinRateYearData | null>(initialData);
  const [yoyLow, setYoyLow] = useState(50);
  const [yoyHigh, setYoyHigh] = useState(100);
  const [isPending, startTransition] = useTransition();

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const y = Number(e.target.value);
    setYear(y);
    startTransition(async () => {
      const newData = await getWinRateData(y, yoyLow, yoyHigh);
      setData(newData);
    });
  };

  if (!data) {
    return (
      <Card className="p-8 text-center text-slate-400">
        <p>暫無資料，請先執行 Python 資料腳本更新資料。</p>
      </Card>
    );
  }

  const buckets = data.data.sort((a, b) => b.burstCount - a.burstCount);
  const bestBucket = buckets.reduce((best, b) => (b.winRate > best.winRate ? b : best), buckets[0]);
  const totalStocks = buckets.reduce((sum, b) => sum + b.stockCount, 0);
  const highestAvgReturn = Math.max(...buckets.map((b) => b.avgReturn));

  const chartData = buckets.map((b) => ({
    name: `${b.burstCount}次`,
    平均漲幅: b.avgReturn,
    中位數漲幅: b.medianReturn,
    勝率: b.winRate,
  }));

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

        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">YOY 低</span>
          <input
            type="range"
            min={0}
            max={500}
            step={10}
            value={yoyLow}
            onChange={(e) => setYoyLow(Number(e.target.value))}
            className="flex-1 accent-indigo-500"
          />
          <span className="text-sm font-mono text-indigo-600 dark:text-indigo-400 w-12 text-right">{yoyLow}%</span>
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">高</span>
          <input
            type="range"
            min={0}
            max={500}
            step={10}
            value={yoyHigh}
            onChange={(e) => setYoyHigh(Number(e.target.value))}
            className="flex-1 accent-indigo-500"
          />
          <span className="text-sm font-mono text-indigo-600 dark:text-indigo-400 w-12 text-right">{yoyHigh}%</span>
        </div>

        {isPending && <span className="text-xs text-slate-400 animate-pulse">載入中...</span>}
      </div>

      {/* 統計摘要卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          icon={<Trophy className="w-4 h-4" />}
          label="最佳爆發次數"
          value={`${bestBucket.burstCount} 次`}
          sub={`勝率 ${bestBucket.winRate.toFixed(1)}%`}
          color="text-amber-600 dark:text-amber-400"
        />
        <MetricCard
          icon={<Target className="w-4 h-4" />}
          label="最高勝率"
          value={`${bestBucket.winRate.toFixed(1)}%`}
          sub={`${bestBucket.stockCount} 檔樣本`}
          color="text-emerald-600 dark:text-emerald-400"
        />
        <MetricCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="最高平均漲幅"
          value={`+${highestAvgReturn.toFixed(1)}%`}
          sub={`${year} 年度`}
          color="text-indigo-600 dark:text-indigo-400"
        />
        <MetricCard
          icon={<Users className="w-4 h-4" />}
          label="總樣本股票數"
          value={`${totalStocks} 檔`}
          sub={`YOY ${yoyLow}-${yoyHigh}%`}
          color="text-slate-600 dark:text-slate-400"
        />
      </div>

      {/* 主圖表 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            爆發次數 vs 年度報酬
          </CardTitle>
          <CardDescription>
            YOY {yoyLow}-{yoyHigh}% 達標次數與股價年度漲幅的關係
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} unit="%" />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} unit="%" domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--background)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value, name) => [`${Number(value).toFixed(1)}%`, String(name)]}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="平均漲幅" fill="#6366f1" radius={[4, 4, 0, 0]} opacity={0.85} />
              <Line yAxisId="left" type="monotone" dataKey="中位數漲幅" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
              <Line yAxisId="right" type="monotone" dataKey="勝率" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 勝率統計表格 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">詳細統計表</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  {['爆發次數', '股票數', '平均漲幅', '中位數', '勝率(>20%)', '翻倍率(>100%)', '標準差'].map((h) => (
                    <th key={h} className="py-2 px-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {buckets.map((b) => (
                  <React.Fragment key={b.burstCount}>
                    <tr className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-2 px-3">
                        <Badge variant="outline" className="font-mono">{b.burstCount} 次</Badge>
                      </td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{b.stockCount} 檔</td>
                      <td className={`py-2 px-3 font-bold ${b.avgReturn >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                        {b.avgReturn >= 0 ? '+' : ''}{b.avgReturn.toFixed(1)}%
                      </td>
                      <td className={`py-2 px-3 ${b.medianReturn >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                        {b.medianReturn >= 0 ? '+' : ''}{b.medianReturn.toFixed(1)}%
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 w-16">
                            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${b.winRate}%` }} />
                          </div>
                          <span className="text-xs font-mono">{b.winRate.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400 font-mono text-xs">{b.doubleRate.toFixed(1)}%</td>
                      <td className="py-2 px-3 text-slate-500 dark:text-slate-400 font-mono text-xs">±{b.stdDev.toFixed(1)}%</td>
                    </tr>
                    {b.stocks && b.stocks.length > 0 && (
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        <td colSpan={7} className="px-3 pb-2">
                          <StockListAccordion bucket={b} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-slate-400 text-center">
        資料來源：ETF 持股宇宙（53 檔）｜研究期間：前一年 12 月 ~ 目標年 11 月（共 12 份月營收）｜股價計算：2025-06 至 12 月半年漲幅
      </p>
    </div>
  );
}
