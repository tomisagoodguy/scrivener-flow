import React from 'react';
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

interface RevenueData {
  data_date: string;
  revenue: number;
  revenue_yoy: number | null;
  revenue_mom: number | null;
}

interface MonthlyPrice {
  month: string;
  avg_price: number;
}

interface RevenueChartProps {
  revenueData: RevenueData[];
  priceData: MonthlyPrice[];
}

/**
 * 營收 vs 股價圖表
 * 左軸：營收（長條圖）
 * 右軸：月均價（折線圖）
 */
export function RevenueChart({ revenueData, priceData }: RevenueChartProps) {
  // 合併數據
  const chartData = revenueData.map(rev => {
    const month = rev.data_date.substring(0, 7); // YYYY-MM
    const price = priceData.find(p => p.month === month);
    
    return {
      month,
      revenue: rev.revenue,
      revenue_yoy: rev.revenue_yoy,
      price: price?.avg_price || null,
    };
  });

  // 計算 MA(3) 和 MA(12)
  const revenueWithMA = chartData.map((item, idx) => {
    const ma3Values = chartData
      .slice(Math.max(0, idx - 2), idx + 1)
      .map(d => d.revenue);
    const ma12Values = chartData
      .slice(Math.max(0, idx - 11), idx + 1)
      .map(d => d.revenue);

    const ma3 = ma3Values.length > 0 
      ? ma3Values.reduce((a, b) => a + b, 0) / ma3Values.length
      : null;
    const ma12 = ma12Values.length > 0
      ? ma12Values.reduce((a, b) => a + b, 0) / ma12Values.length
      : null;

    return {
      ...item,
      ma3,
      ma12,
    };
  });

  // 根據 YoY 決定顏色（台股習慣：紅漲綠跌）
  const getBarColor = (yoy: number | null) => {
    if (yoy === null || yoy === undefined) return '#94a3b8'; // gray-400
    return yoy > 0 ? '#ef4444' : '#22c55e'; // red-500 : green-500
  };

  // 格式化營收為億/萬
  const formatRevenue = (value: number) => {
    if (value >= 1e8) return `${(value / 1e8).toFixed(1)}億`;
    if (value >= 1e4) return `${(value / 1e4).toFixed(0)}萬`;
    return value.toFixed(0);
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart
        data={revenueWithMA}
        margin={{ top: 20, right: 60, left: 20, bottom: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12 }}
          angle={-30}
          textAnchor="end"
          height={70}
        />
        <YAxis
          yAxisId="left"
          orientation="left"
          tickFormatter={formatRevenue}
          tick={{ fontSize: 12 }}
          label={{
            value: '月營收',
            angle: -90,
            position: 'insideLeft',
            style: { textAnchor: 'middle' },
          }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fontSize: 12 }}
          label={{
            value: '月均價',
            angle: 90,
            position: 'insideRight',
            style: { textAnchor: 'middle' },
          }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #ccc',
            borderRadius: '8px',
            padding: '10px',
          }}
          formatter={(value: any, name?: string, props?: any) => {
            if (name === 'revenue' || name === '營收') {
              const yoy = props.payload.revenue_yoy;
              const yoyText = yoy !== null ? ` (YoY ${yoy > 0 ? '+' : ''}${yoy.toFixed(1)}%)` : '';
              return [`${formatRevenue(value)}${yoyText}`, '月營收'];
            }
            if (name === 'ma3') return [formatRevenue(value), 'MA(3)'];
            if (name === 'ma12') return [formatRevenue(value), 'MA(12)'];
            if (name === 'price' || name === '月均價') {
              return [`${value} 元`, '月均價'];
            }
            return [value, name];
          }}
        />
        <Legend />
        
        {/* 營收長條圖 - 使用 Cell 設定動態顏色 */}
        <Bar
          yAxisId="left"
          dataKey="revenue"
          name="營收"
          radius={[4, 4, 0, 0]}
          opacity={0.8}
        >
          {revenueWithMA.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getBarColor(entry.revenue_yoy)} />
          ))}
        </Bar>

        {/* MA 線 */}
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="ma3"
          stroke="#1E90FF"
          strokeWidth={2}
          dot={false}
          name="MA(3)"
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="ma12"
          stroke="#FF8C00"
          strokeWidth={2.5}
          strokeDasharray="5 5"
          dot={false}
          name="MA(12)"
        />

        {/* 月均價折線 */}
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="price"
          stroke="#000000"
          strokeWidth={2.5}
          dot={{ r: 4, fill: '#000' }}
          name="月均價"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
