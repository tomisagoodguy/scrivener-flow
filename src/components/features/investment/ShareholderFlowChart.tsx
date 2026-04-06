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
} from 'recharts';

interface ShareholderData {
  data_date: string;
  shareholder_tier: number;
  holder_count: number | null;
  shares_held: number | null;
  custody_ratio: number | null;
}

interface ShareholderFlowChartProps {
  data: ShareholderData[];
  type: 'large' | 'retail';
}

interface ChartRow {
  date: string;
  fullDate: string;
  cumulative: number;
  cumulativeSum: number;
  [key: string]: string | number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: ChartRow;
  }>;
  tiers: { label: string; color: string }[];
}

const CustomTooltip = ({ active, payload, tiers }: CustomTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-lg">
      <p className="font-semibold text-sm mb-2">{data.fullDate}</p>
      <div className="space-y-1 text-xs">
        {tiers.map(({ label, color }) => {
          const val = data[label];
          const numVal = typeof val === 'number' ? val : 0;
          return (
            <div key={label} className="flex items-center justify-between gap-4">
              <span style={{ color }}>● {label}:</span>
              <span className="font-mono">
                {numVal > 0 ? '+' : ''}{numVal.toFixed(1)}k
              </span>
            </div>
          );
        })}
        <hr className="my-2 border-slate-200 dark:border-slate-700" />
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-600 dark:text-slate-400">累積淨流向:</span>
          <span className={`font-mono font-semibold ${data.cumulativeSum > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {data.cumulativeSum > 0 ? '+' : ''}{data.cumulativeSum.toFixed(1)}k
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * 大戶/散戶籌碼堆疊流向圖
 * 左軸：各級距週變化張數（堆疊長條圖）
 * 右軸：累積淨流向 + 股價（標準化折線圖）
 */
export function ShareholderFlowChart({ data, type }: ShareholderFlowChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // 定義級距
    const innerTierConfig = type === 'large' 
      ? {
          // 大戶：200-1000張+
          tiers: [
            { tier: 11, label: '200-400張', color: '#ef4444' },
            { tier: 12, label: '400-600張', color: '#f97316' },
            { tier: 13, label: '600-800張', color: '#f59e0b' },
            { tier: 14, label: '800-1000張', color: '#eab308' },
            { tier: 15, label: '1000張+', color: '#84cc16' },
          ],
          weeks: 10,
        }
      : {
          // 散戶：1-50張
          tiers: [
            { tier: 1, label: '1-10張', color: '#3b82f6' },
            { tier: 2, label: '10-20張', color: '#6366f1' },
            { tier: 3, label: '20-30張', color: '#8b5cf6' },
            { tier: 4, label: '30-40張', color: '#a855f7' },
            { tier: 5, label: '40-50張', color: '#c026d3' },
          ],
          weeks: 10,
        };

    // 按日期分組
    const dateMap = new Map<string, Map<number, ShareholderData>>();
    
    data.forEach(item => {
      if (!dateMap.has(item.data_date)) {
        dateMap.set(item.data_date, new Map());
      }
      dateMap.get(item.data_date)!.set(item.shareholder_tier, item);
    });

    // 排序日期
    const sortedDates = Array.from(dateMap.keys()).sort();
    
    // 取最近 N 週
    const recentDates = sortedDates.slice(-innerTierConfig.weeks);

    // 計算週變化
    const result = recentDates.map((date, idx) => {
      const currentData = dateMap.get(date)!;
      const prevDate = idx > 0 ? recentDates[idx - 1] : null;
      const prevData = prevDate ? dateMap.get(prevDate) : null;

      const row: ChartRow = {
        date: date.substring(5), // MM-DD
        fullDate: date,
        cumulative: 0,
        cumulativeSum: 0,
      };

      // 計算各級距的週變化（單位：千張）
      innerTierConfig.tiers.forEach(({ tier, label }) => {
        const currentShares = currentData.get(tier)?.shares_held || 0;
        const prevShares = prevData?.get(tier)?.shares_held || currentShares;
        const change = (currentShares - prevShares) / 1000; // 轉為千張
        row[label] = change;
      });

      // 計算累積淨流向（所有級距加總）
      const totalChange = innerTierConfig.tiers.reduce((sum, { tier }) => {
        const currentShares = currentData.get(tier)?.shares_held || 0;
        const prevShares = prevData?.get(tier)?.shares_held || currentShares;
        return sum + (currentShares - prevShares);
      }, 0);

      row.cumulative = totalChange / 1000; // 轉為千張

      return row;
    });

    // 計算累積值
    let cumulativeSum = 0;
    result.forEach(row => {
      cumulativeSum += row.cumulative;
      row.cumulativeSum = cumulativeSum;
    });

    return result;
  }, [data, type]);

  const tierConfig = useMemo(() => type === 'large' 
    ? {
        tiers: [
          { label: '200-400張', color: '#ef4444' },
          { label: '400-600張', color: '#f97316' },
          { label: '600-800張', color: '#f59e0b' },
          { label: '800-1000張', color: '#eab308' },
          { label: '1000張+', color: '#84cc16' },
        ],
        title: '大戶籌碼堆疊流向圖',
      }
    : {
        tiers: [
          { label: '1-10張', color: '#3b82f6' },
          { label: '10-20張', color: '#6366f1' },
          { label: '20-30張', color: '#8b5cf6' },
          { label: '30-40張', color: '#a855f7' },
          { label: '40-50張', color: '#c026d3' },
        ],
        title: '散戶籌碼堆疊流向圖',
      }, [type]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        無{type === 'large' ? '大戶' : '散戶'}流向數據
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
        {tierConfig.title}
      </h3>
      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart
          data={chartData}
          margin={{ top: 20, right: 60, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            angle={-45}
            textAnchor="end"
            height={70}
          />
          
          <YAxis
            yAxisId="left"
            orientation="left"
            tick={{ fontSize: 11 }}
            label={{
              value: '週變化 (千張)',
              angle: -90,
              position: 'insideLeft',
              style: { textAnchor: 'middle', fontSize: 11 },
            }}
          />
          
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11 }}
            label={{
              value: '累積淨流向 (千張)',
              angle: 90,
              position: 'insideRight',
              style: { textAnchor: 'middle', fontSize: 11 },
            }}
          />
          
          <Tooltip content={<CustomTooltip tiers={tierConfig.tiers} />} />
          <Legend 
            wrapperStyle={{ fontSize: '11px' }}
            iconSize={10}
          />

          {tierConfig.tiers.map(({ label, color }) => (
            <Bar
              key={label}
              yAxisId="left"
              dataKey={label}
              stackId="stack"
              fill={color}
              opacity={0.8}
            />
          ))}

          <Line
            yAxisId="right"
            type="monotone"
            dataKey="cumulativeSum"
            stroke="#000000"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#000' }}
            name="累積淨流向"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
