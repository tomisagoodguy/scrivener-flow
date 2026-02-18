'use client';

import React, { useState, useTransition, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getHeatmapData } from '@/app/actions/revenueLabActions';
import type { HeatmapYearData, HeatmapStatMode, HeatmapCell, ReturnBin } from '@/types/revenuelab';

const AVAILABLE_YEARS = [2024, 2023, 2022, 2021, 2020];

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

// ── 顏色映射 ──────────────────────────────────────────────

function valueToColor(value: number, mode: HeatmapStatMode): string {
  if (mode === 'stdDev') {
    const intensity = Math.min(Math.max(value / 150, 0), 1);
    const l = 95 - intensity * 45;
    return `hsl(220, 70%, ${l}%)`;
  }
  if (mode === 'positiveRate') {
    const intensity = value / 100;
    const l = 95 - intensity * 50;
    return `hsl(142, 70%, ${l}%)`;
  }
  if (value < 0) {
    const intensity = Math.min(Math.abs(value) / 100, 1);
    const l = 95 - intensity * 45;
    return `hsl(0, 75%, ${l}%)`;
  } else {
    const intensity = Math.min(value / 200, 1);
    const l = 95 - intensity * 50;
    return `hsl(142, 70%, ${l}%)`;
  }
}

function textColorClass(value: number, mode: HeatmapStatMode): string {
  if (mode === 'stdDev') return value > 80 ? 'text-blue-900' : 'text-blue-700';
  if (mode === 'positiveRate') return value > 60 ? 'text-emerald-900' : 'text-emerald-700';
  return value < -30 ? 'text-red-900' : value < 0 ? 'text-red-700' : value > 80 ? 'text-emerald-900' : 'text-emerald-700';
}

// ── 月份格式化 ────────────────────────────────────────────

function formatMonth(month: string): string {
  const parts = month.split('-');
  const m = parts[1];
  const monthNames = ['', '1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  return monthNames[Number(m)] ?? month;
}

// ── Cell Tooltip（原生 title）────────────────────────────

function HeatmapCellContent({
  cell,
  bin,
  mode,
}: {
  cell: HeatmapCell;
  bin: ReturnBin;
  mode: HeatmapStatMode;
}) {
  const value = cell[mode];
  const bg = valueToColor(value, mode);
  const tc = textColorClass(value, mode);
  const modeLabel = STAT_MODES.find((m) => m.value === mode)?.label ?? mode;
  const tooltipText = `${bin.label} | ${formatMonth(cell.month)}\n${modeLabel}: ${value.toFixed(1)}%\n中位數: ${cell.median.toFixed(1)}%\n平均值: ${cell.mean.toFixed(1)}%\n樣本數: ${cell.dataPoints} 檔`;

  return (
    <div
      title={tooltipText}
      className={`py-2 text-center text-xs font-mono font-bold cursor-default transition-transform hover:scale-105 hover:z-10 hover:shadow-md rounded-sm ${tc}`}
      style={{ backgroundColor: bg }}
    >
      {value.toFixed(0)}
      {mode === 'positiveRate' ? '%' : ''}
    </div>
  );
}

// ── 色階圖例 ──────────────────────────────────────────────

function ColorLegend({ mode }: { mode: HeatmapStatMode }) {
  const steps =
    mode === 'positiveRate' ? [0, 25, 50, 75, 100]
    : mode === 'stdDev' ? [0, 50, 100, 150]
    : [-100, -50, 0, 50, 100, 200];

  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <span>低</span>
      <div className="flex h-3 rounded overflow-hidden" style={{ width: 120 }}>
        {steps.map((v, i) => (
          <div key={i} className="flex-1" style={{ backgroundColor: valueToColor(v, mode) }} />
        ))}
      </div>
      <span>高</span>
    </div>
  );
}

// ── 主元件 ────────────────────────────────────────────────

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
                        ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                        : 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20'
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
    </div>
  );
}
