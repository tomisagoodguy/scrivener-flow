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
  ReferenceLine
} from 'recharts';
import { PriceData, IndicatorService } from '@/lib/investment/indicators';


interface InvestmentTrustChartProps {
  data: PriceData[];
  isDarkMode?: boolean;
}

export function InvestmentTrustChart({ data, isDarkMode = false }: InvestmentTrustChartProps) {
  const isDark = isDarkMode;

  // Sort data by date just in case
  const sortedData = [...data].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  // Calculate MAs
  const ma5 = IndicatorService.calculateFieldSMA(sortedData, 'it_buy', 5);
  const ma20 = IndicatorService.calculateFieldSMA(sortedData, 'it_buy', 20);

  // Merge MAs back into data for chart
  const chartData = sortedData.map(item => {
    const m5 = ma5.find(m => m.time === item.time);
    const m20 = ma20.find(m => m.time === item.time);
    return {
      ...item,
      ma5: m5 ? m5.value : null,
      ma20: m20 ? m20.value : null,
      // Ensure specific colors for positive/negative values
      fillColor: (item.it_buy || 0) > 0 ? '#ef4444' : '#22c55e'
    };
  });

  // Calculate dynamic Y-axis domain
  // Converting to "Zhang" (1000 shares) for better readability
  const displayData = chartData.slice(-240); // Default show last ~240 days
  
  const values = displayData.map(d => (d.it_buy || 0) / 1000);
  const maxVal = Math.max(...values, ...displayData.map(d => (d.ma5 || -Infinity) / 1000), ...displayData.map(d => (d.ma20 || -Infinity) / 1000));
  const minVal = Math.min(...values, ...displayData.map(d => (d.ma5 || Infinity) / 1000), ...displayData.map(d => (d.ma20 || Infinity) / 1000));
  
  const allZero = values.every(v => v === 0);
  // Add some padding to domain
  const domainMax = Math.ceil(Math.abs(maxVal) * 1.1) || 10;
  const domainMin = Math.floor(-Math.abs(minVal) * 1.1) || -10;
  // Use symmetric domain if mixed positive/negative to clear 0 line
  const absMax = Math.max(Math.abs(maxVal), Math.abs(minVal));
  const symmetricDomain = [-absMax * 1.1, absMax * 1.1];

  return (
    <div className="relative">
      {allZero && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <span className="text-slate-400 text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded opacity-70">
            近半年無投信買賣數據
          </span>
        </div>
      )}
      <ResponsiveContainer width="100%" height={300}>
      <ComposedChart
        data={displayData}
        margin={{
          top: 10,
          right: 30,
          left: 0,
          bottom: 0,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" opacity={0.2} stroke={isDark ? '#64748b' : '#94a3b8'} vertical={false} />
        <XAxis 
          dataKey="time" 
          stroke={isDark ? '#94a3b8' : '#475569'} 
          fontSize={10} 
          tickFormatter={(value) => value.slice(5)} // Show MM-DD
          minTickGap={30}
        />
        <YAxis 
          stroke={isDark ? '#94a3b8' : '#475569'} 
          fontSize={10}
          tickFormatter={(value) => `${(value).toFixed(0)}`}
          label={{ value: '張', angle: -90, position: 'insideLeft', style: { fill: isDark ? '#94a3b8' : '#475569', fontSize: '10px' } }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            borderColor: isDark ? '#334155' : '#e2e8f0',
            color: isDark ? '#e2e8f0' : '#1e293b',
            borderRadius: '8px',
            fontSize: '12px'
          }}
          formatter={(value: any, name: any) => {
            // Already converted to Zhang in dataKey
            const valInZhang = Number(value).toFixed(1);
            if (name === 'it_buy') return [valInZhang, '買賣超 (張)'];
            if (name === 'ma5') return [valInZhang, '5日均 (張)'];
            if (name === 'ma20') return [valInZhang, '20日均 (張)'];
            return [value, name];
          }}
          labelFormatter={(label) => `📅 ${label}`}
        />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        <ReferenceLine y={0} stroke={isDark ? '#e2e8f0' : '#334155'} strokeOpacity={0.5} />
        <Bar 
          dataKey={(data) => (data.it_buy || 0) / 1000} 
          name="it_buy" 
          barSize={6}
        >
           {displayData.map((entry, index) => (
             <Cell key={`cell-${index}`} fill={entry.fillColor} />
           ))}
        </Bar>
        <Line 
          type="monotone" 
          dataKey={(data) => (data.ma5 || 0) / 1000} 
          stroke="#f59e0b" 
          dot={false} 
          strokeWidth={1.5} 
          name="ma5"
        />
        <Line 
          type="monotone" 
          dataKey={(data) => (data.ma20 || 0) / 1000} 
          stroke="#8b5cf6" 
          dot={false} 
          strokeWidth={1.5} 
          name="ma20"
        />
      </ComposedChart>
    </ResponsiveContainer>
    </div>
  );
}
