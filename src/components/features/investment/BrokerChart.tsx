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
  Cell
} from 'recharts';

interface BrokerData {
  data_date: string;
  net_volume: number;
  force_metric: number | null;
}

interface BrokerChartProps {
  data: BrokerData[];
}

/**
 * 券商分點買賣超前15大趨勢圖
 * 包含：淨買賣超金額 (Bar) + 主力動能指標 (Line)
 */
export function BrokerChart({ data }: BrokerChartProps) {
  const getBarColor = (val: number) => {
    return val > 0 ? '#ef4444' : '#22c55e'; // 紅買綠賣
  };

  const formatVolume = (val: number) => {
      // 假設是金額 (元)，轉為 萬/億
      // User formula: (buy_vol - sell_vol) * close. This is Value (元).
      const absVal = Math.abs(val);
      if (absVal >= 100000000) return `${(val / 100000000).toFixed(1)}億`;
      if (absVal >= 10000) return `${(val / 10000).toFixed(0)}萬`;
      return val.toFixed(0);
  };

  // 只顯示最近 120 天的數據，避免圖表過於擁擠 (或由父組件控制)
  // 這裡假設父組件已傳入適當範圍，但為了安全可以 slice
  // const chartData = data.slice(-120); 
  const chartData = data;

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart
        data={chartData}
        margin={{ top: 20, right: 60, left: 20, bottom: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis 
          dataKey="data_date" 
          tickFormatter={(date) => date.substring(5)} // MM-DD
          minTickGap={30}
          tick={{ fontSize: 12 }}
        />
        <YAxis 
          yAxisId="left"
          tickFormatter={formatVolume}
          tick={{ fontSize: 12 }}
          label={{ 
            value: '淨買賣超', 
            angle: -90, 
            position: 'insideLeft',
            style: { textAnchor: 'middle' }
          }}
        />
        <YAxis 
          yAxisId="right" 
          orientation="right"
          domain={[
            (dataMin: number) => (dataMin - Math.abs(dataMin) * 0.2),
            (dataMax: number) => (dataMax + Math.abs(dataMax) * 0.2)
          ]}
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => value.toFixed(2)}
          label={{ 
            value: '主力動能', 
            angle: 90, 
            position: 'insideRight',
            style: { textAnchor: 'middle' }
          }}
        />
        <Tooltip 
            contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #ccc',
                borderRadius: '8px',
                padding: '10px',
            }}
            formatter={(value: any, name?: string) => {
                if (name === '淨買賣超') return [formatVolume(value), name];
                if (name === '主力動能') return [value?.toFixed(2), name];
                return [value, name];
            }}
            labelFormatter={(label) => label}
        />
        <Legend />
        
        <Bar dataKey="net_volume" name="淨買賣超" yAxisId="left" opacity={0.8} radius={[2, 2, 0, 0]}>
            {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.net_volume)} />
            ))}
        </Bar>
        
        <Line 
            type="monotone" 
            dataKey="force_metric" 
            name="主力動能" 
            yAxisId="right" 
            stroke="#f59e0b" 
            dot={false} 
            strokeWidth={2}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
