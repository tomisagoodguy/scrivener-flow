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
    return `hsl(0, 75%, ${l}%)`; // 台股慣例：正值為紅
  }
  if (value < 0) {
    const intensity = Math.min(Math.abs(value) / 100, 1);
    const l = 95 - intensity * 45;
    return `hsl(142, 70%, ${l}%)`; // 台股慣例：負值為綠
  } else {
    const intensity = Math.min(value / 200, 1);
    const l = 95 - intensity * 50;
    return `hsl(0, 75%, ${l}%)`; // 台股慣例：正值為紅
  }
}

function textColorClass(value: number, mode: HeatmapStatMode): string {
  if (mode === 'stdDev') return value > 80 ? 'text-blue-900' : 'text-blue-700';
  if (mode === 'positiveRate') return value > 60 ? 'text-red-900' : 'text-red-700';
  return value < -30 ? 'text-emerald-900' : value < 0 ? 'text-emerald-700' : value > 80 ? 'text-red-900' : 'text-red-700';
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

      {/* AI 分析報告生成區塊 */}
      <Card className="border-indigo-100 dark:border-indigo-900 bg-indigo-50/30 dark:bg-indigo-900/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                🤖 AI 智能分析報告助手
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">New</span>
              </CardTitle>
              <CardDescription>
                生成專屬於您的 00981 投資組合深度分析 Prompt，複製後發送給 ChatGPT/Claude 即可獲得專業報告。
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <textarea
              readOnly
              value={useMemo(() => generateAiPrompt(data, year, mode), [data, year, mode])}
              className="w-full h-48 p-4 text-xs font-mono text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <div className="absolute bottom-4 right-4 flex gap-2">
              <button
                onClick={() => {
                  const prompt = generateAiPrompt(data, year, mode);
                  navigator.clipboard.writeText(prompt);
                  // 簡單的 feedback 效果可以透過 state 實作，這裡簡化處理
                  alert('已複製分析指令！');
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-md shadow-sm transition-colors flex items-center gap-2"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                複製完整指令
              </button>
              <button
                 onClick={() => {
                  const prompt = generateAiPrompt(data, year, mode);
                  window.open(`https://chatgpt.com/?q=${encodeURIComponent(prompt)}`, '_blank');
                 }}
                 className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-medium rounded-md shadow-sm transition-colors"
              >
                前往 ChatGPT
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            💡 提示：此指令包含完整的區間統計數據（中位數、標準差、變異係數等），能讓 AI 進行比肉眼觀察更精確的量化分析。
          </p>
        </CardContent>
      </Card>
      
    </div>
  );
}

function generateAiPrompt(data: HeatmapYearData, year: number, mode: HeatmapStatMode): string {
  const totalSamples = data.returnBins.reduce((acc, b) => acc + b.stockCount, 0);
  const fallingBins = data.returnBins.filter((b) => b.avgAnnualReturn < 0);
  const risingBins = data.returnBins.filter((b) => b.avgAnnualReturn >= 0);
  
  const totalFalling = fallingBins.reduce((acc, b) => acc + b.stockCount, 0);
  const totalRising = risingBins.reduce((acc, b) => acc + b.stockCount, 0);
  
  const fallingRatio = totalSamples > 0 ? ((totalFalling / totalSamples) * 100).toFixed(1) : '0.0';
  const risingRatio = totalSamples > 0 ? ((totalRising / totalSamples) * 100).toFixed(1) : '0.0';

  const worstBin = fallingBins.length > 0 
    ? fallingBins.reduce((prev, curr) => (prev.avgAnnualReturn < curr.avgAnnualReturn ? prev : curr)) 
    : null;
  const bestBin = risingBins.length > 0 
    ? risingBins.reduce((prev, curr) => (prev.avgAnnualReturn > curr.avgAnnualReturn ? prev : curr)) 
    : null;

  let table = '| 漲幅區間 | 股票數量 | 均漲幅 | 均營收 | 中位數 | 標準差 | 變異係數 | 四分位距 | 正成長% |\n';
  table += '|----------|----------|--------|--------|--------|--------|----------|----------|---------|\n';

  const sortedBins = [...data.returnBins].sort((a, b) => a.order - b.order);

  for (const bin of sortedBins) {
    if (bin.stockCount === 0) continue;
    table += `| ${bin.label} | ${bin.stockCount}檔 | ${bin.avgAnnualReturn}% | ${bin.meanRevenue?.toFixed(1) ?? '-'}% | ${bin.medianRevenue?.toFixed(1) ?? '-'}% | ${bin.stdDevRevenue?.toFixed(1) ?? '-'} | ${bin.cvRevenue?.toFixed(2) ?? '-'} | ${bin.iqrRevenue?.toFixed(1) ?? '-'} | ${bin.positiveRateRevenue?.toFixed(1) ?? '-'}% |\n`;
  }

  const currentDate = new Date().toISOString().split('T')[0];
  const modeLabel = STAT_MODES.find(m => m.value === mode)?.label ?? mode;

  return `# 台股營收與股價關聯分析報告
分析時間: ${currentDate}
分析年度: ${year}年
成長指標: 年增率 (YoY)
股價計算方式: 收盤價 (實戰版)
統計方法: ${modeLabel}
總樣本數: ${totalSamples.toLocaleString()}檔
下跌股票比例: ${fallingRatio}% (${totalFalling.toLocaleString()}檔)
上漲股票比例: ${risingRatio}% (${totalRising.toLocaleString()}檔)

## 🎯 重要數據說明
**這是「按股價漲幅分組看營收表現」，分組間隔為：下跌每10%，上漲每100%**

### 數據結構說明：
1. **分組依據**：先按照股票「年度實際漲幅（使用收盤價計算）」分成不同區間
   - 下跌股票：每10%一個間隔（從-100%以下到-10%~0%）
   - 上漲股票：每100%一個間隔（從0-100%到1000%以上）

2. **觀察指標**：在每個股價漲幅區間內，計算該區間股票的營收全維度表現（包含離散程度指標）

### 關鍵發現：
1. **最慘的下跌區間**: ${worstBin ? `${worstBin.label} (平均股價漲幅${worstBin.avgAnnualReturn}%，營收正增長比例${worstBin.positiveRateRevenue?.toFixed(1)}%)` : '無資料'}
2. **最好的上漲區間**: ${bestBin ? `${bestBin.label} (平均股價漲幅${bestBin.avgAnnualReturn}%，營收正增長比例${bestBin.positiveRateRevenue?.toFixed(1)}%)` : '無資料'}

## 數據摘要全表 (包含離散指標)
${table}

## 🎯 分析任務
請擔任專業量化分析師，根據以上細分數據回答：

### 1. 下跌股票的梯度分析
- **跌幅深度與營收表現的關係**：越深的跌幅，營收表現是否越差？
- **關鍵轉折點**：哪個跌幅區間的營收表現出現明顯惡化？

### 2. 上漲股票的層級分析
- **漲幅高度與營收表現的關係**：漲得越高的股票，營收表現是否越好？
- **甜蜜點分析**：哪個漲幅區間的營收表現最突出？

### 3. 對比分析：下跌vs上漲
- **營收正增長比例**：差距有多大？
- **營收波動率 (變異係數/標準差)**：哪個區間的營收波動最大？

### 4. 投資策略啟示
- **抄底策略**：根據數據，哪個跌幅區間最適合抄底？
- **強勢股篩選**：要找到潛在飆股，應該關注哪些營收特徵？
`;
}

