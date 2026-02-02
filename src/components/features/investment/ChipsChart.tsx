import React, { useMemo } from 'react';
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
  Cell,
} from 'recharts';

interface ShareholderData {
  data_date: string;
  shareholder_tier: number;
  holder_count: number | null;
  shares_held: number | null;
  custody_ratio: number | null;
}

interface ChipsChartProps {
  data: ShareholderData[];
}

/**
 * 股權分散疊圖 (Shareholder Distribution Overlay)
 * 左軸：總股東人數（長條圖，動態顏色：增綠減紅）
 * 右軸：持股百分比折線圖（1-100張、100-1000張、1000張以上）
 * 顯示近 48 週數據
 */
export function ChipsChart({ data }: ChipsChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // 按日期分組
    const dateMap = new Map<string, Map<number, ShareholderData>>();
    
    data.forEach(item => {
      if (!dateMap.has(item.data_date)) {
        dateMap.set(item.data_date, new Map());
      }
      dateMap.get(item.data_date)!.set(item.shareholder_tier, item);
    });

    // 轉換為圖表數據
    const result = Array.from(dateMap.entries()).map(([date, tierMap]) => {
      // 總股東人數 (tier 17)
      const totalHolders = tierMap.get(17)?.holder_count || 0;

      // 散戶 (1-100張) = tier 1-9
      const retailShares = [1, 2, 3, 4, 5, 6, 7, 8, 9]
        .reduce((sum, tier) => sum + (tierMap.get(tier)?.shares_held || 0), 0);

      // 中戶 (100-1000張) = tier 10
      const midShares = tierMap.get(10)?.shares_held || 0;

      // 大戶 (1000張以上) = tier 11-15
      const largeShares = [11, 12, 13, 14, 15]
        .reduce((sum, tier) => sum + (tierMap.get(tier)?.shares_held || 0), 0);

      const totalShares = retailShares + midShares + largeShares;

      return {
        date: date.substring(5), // MM-DD
        fullDate: date,
        totalHolders,
        retailPct: totalShares > 0 ? (retailShares / totalShares) * 100 : 0,
        midPct: totalShares > 0 ? (midShares / totalShares) * 100 : 0,
        largePct: totalShares > 0 ? (largeShares / totalShares) * 100 : 0,
      };
    });

    // 排序並取最近 48 週
    result.sort((a, b) => a.fullDate.localeCompare(b.fullDate));
    const recent48 = result.slice(-48);

    // 計算總股東人數的變化（用於動態顏色）
    return recent48.map((item, idx) => {
      const prevHolders = idx > 0 ? recent48[idx - 1].totalHolders : item.totalHolders;
      const holderChange = item.totalHolders - prevHolders;

      return {
        ...item,
        holderChange,
      };
    });
  }, [data]);

  // 動態顏色：增加為綠色，減少為紅色
  const getBarColor = (change: number) => {
    if (change > 0) return '#22c55e'; // 綠色
    if (change < 0) return '#ef4444'; // 紅色
    return '#94a3b8'; // 灰色
  };

  // 自定義 Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;

    return (
      <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-lg">
        <p className="font-semibold text-sm mb-2">{data.fullDate}</p>
        <div className="space-y-1 text-xs">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-600 dark:text-slate-400">總股東人數:</span>
            <span className="font-mono font-semibold">{data.totalHolders.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-600 dark:text-slate-400">週變化:</span>
            <span className={`font-mono font-semibold ${data.holderChange > 0 ? 'text-green-600' : data.holderChange < 0 ? 'text-red-600' : 'text-slate-600'}`}>
              {data.holderChange > 0 ? '+' : ''}{data.holderChange.toLocaleString()}
            </span>
          </div>
          <hr className="my-2 border-slate-200 dark:border-slate-700" />
          <div className="flex items-center justify-between gap-4">
            <span style={{ color: '#ef4444' }}>● 1-100張:</span>
            <span className="font-mono">{data.retailPct.toFixed(1)}%</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span style={{ color: '#3b82f6' }}>● 100-1000張:</span>
            <span className="font-mono">{data.midPct.toFixed(1)}%</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span style={{ color: '#22c55e' }}>● 1000張+:</span>
            <span className="font-mono">{data.largePct.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    );
  };

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        無股權分散數據
      </div>
    );
  }

  // 計算 Y 軸動態範圍（股東人數）
  const holderCounts = chartData.map(d => d.totalHolders);
  const minHolders = Math.min(...holderCounts);
  const maxHolders = Math.max(...holderCounts);
  const holderRange = maxHolders - minHolders;
  const yAxisMin = Math.floor(minHolders - holderRange * 0.1);
  const yAxisMax = Math.ceil(maxHolders + holderRange * 0.1);

  return (
    <ResponsiveContainer width="100%" height={450}>
      <ComposedChart
        data={chartData}
        margin={{ top: 20, right: 80, left: 20, bottom: 60 }}
      >
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          angle={-45}
          textAnchor="end"
          height={80}
          interval={Math.floor(chartData.length / 12)} // 顯示約 12 個標籤
        />
        
        {/* 左軸：總股東人數 */}
        <YAxis
          yAxisId="left"
          orientation="left"
          domain={[yAxisMin, yAxisMax]}
          tick={{ fontSize: 11 }}
          label={{
            value: '總股東人數',
            angle: -90,
            position: 'insideLeft',
            style: { textAnchor: 'middle', fontSize: 12 },
          }}
        />
        
        {/* 右軸：持股百分比 */}
        <YAxis
          yAxisId="right"
          orientation="right"
          domain={[0, 100]}
          tick={{ fontSize: 11 }}
          label={{
            value: '持股百分比 (%)',
            angle: 90,
            position: 'insideRight',
            style: { textAnchor: 'middle', fontSize: 12 },
          }}
        />
        
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          wrapperStyle={{ fontSize: '12px' }}
          iconSize={12}
        />

        {/* 總股東人數長條圖（動態顏色） */}
        <Bar
          yAxisId="left"
          dataKey="totalHolders"
          name="總股東人數"
          radius={[4, 4, 0, 0]}
          opacity={0.8}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getBarColor(entry.holderChange)} />
          ))}
        </Bar>

        {/* 持股百分比折線圖 */}
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="retailPct"
          stroke="#ef4444"
          strokeWidth={2}
          dot={{ r: 3 }}
          name="1-100張 (%)"
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="midPct"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ r: 3 }}
          name="100-1000張 (%)"
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="largePct"
          stroke="#22c55e"
          strokeWidth={2.5}
          dot={{ r: 3 }}
          name="1000張+ (%)"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
