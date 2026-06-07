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
  LabelList,
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
    // 修正：Finlab 或資料源可能將資料日期標記為「公布日」或是下個月 1 號 (例如 1 月營收標為 2/1 或 2026-02)
    // 用戶指出：通常營收月份都要 -1
    const dateObj = new Date(rev.data_date);
    dateObj.setMonth(dateObj.getMonth() - 1);
    
    // Format YYYY-MM safely
    const year = dateObj.getFullYear();
    const monthStr = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const displayMonth = `${year}-${monthStr}`;

    const price = priceData.find(p => p.month === displayMonth);
    
    return {
      month: displayMonth,
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
  // 輸入單位通常為「千元」，因此先 * 1000 轉為「元」
  const formatRevenue = (value: number) => {
    const realValue = value * 1000;
    if (realValue >= 1e8) return `${(realValue / 1e8).toFixed(1)}億`; // 大於 1 億
    if (realValue >= 1e4) return `${(realValue / 1e4).toFixed(0)}萬`; // 大於 1 萬
    return realValue.toFixed(0);
  };

  // 找出最新數據月份
  const latestData = revenueWithMA.length > 0 ? revenueWithMA[revenueWithMA.length - 1] : null;

  // 動態計算「最新月份是否剛公布」與「下一個等待月份」
  const revenueStatus = (() => {
    if (!latestData?.month) return { isRecent: false, latestMonthNum: 0, waitingLabel: '---', deadlineLabel: '---' };
    const [yearStr, monthStr] = latestData.month.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    const today = new Date();
    // 幾個月前（0 = 本月，1 = 上月）
    const monthsAgo = (today.getFullYear() - year) * 12 + (today.getMonth() + 1 - month);
    // 台股營收截止日為次月 10 日，最新資料在 2 個月內算「剛公布」
    const isRecent = monthsAgo <= 2;
    // 下一個待公布月份 = latestMonth + 1
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    // 截止月 = nextMonth + 1
    const deadlineMonth = nextMonth === 12 ? 1 : nextMonth + 1;
    return {
      isRecent,
      latestMonthNum: month,
      waitingLabel: `${nextYear}-${String(nextMonth).padStart(2, '0')} (${nextYear}/${deadlineMonth}/10前)`,
    };
  })();

  return (
    <div className="flex flex-col h-full">
      {/* 狀態提示列 */}
      <div className="flex items-center justify-between mb-4 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${revenueStatus.isRecent ? 'bg-rose-500 animate-pulse' : 'bg-slate-400'}`} />
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
             (營收月份: {latestData?.month || '---'})
          </span>
        </div>
        {revenueStatus.isRecent ? (
          <span className="text-[10px] px-2 py-0.5 bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 rounded-full font-black animate-bounce">
            NEW {revenueStatus.latestMonthNum}月營收已公布
          </span>
        ) : (
          <span className="text-[10px] px-2 py-0.5 bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400 rounded-full font-medium">
            等待 {revenueStatus.waitingLabel} 營收公布
          </span>
        )}
      </div>

      <div className="flex-1 w-full min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
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
            formatter={(value: unknown, name?: string, props?: { payload?: RevenueData & { ma3: number | null; ma12: number | null; price: number | null } }) => {
                if (name === 'revenue' || name === '營收') {
                  const yoy = props?.payload?.revenue_yoy;
                  const yoyText = (yoy !== null && yoy !== undefined) ? ` (YoY ${Number(yoy) > 0 ? '+' : ''}${Number(yoy).toFixed(1)}%)` : '';
                  return [`${formatRevenue(Number(value || 0))}${yoyText}`, '月營收'];
                }
                if (name === 'ma3') return [formatRevenue(Number(value || 0)), 'MA(3)'];
                if (name === 'ma12') return [formatRevenue(Number(value || 0)), 'MA(12)'];
                if (name === 'price' || name === '月均價') {
                  return [`${value} 元`, '月均價'];
                }
                return [String(value), name];
              }}
            />
            <Legend />
            
            <Bar
              yAxisId="left"
              dataKey="revenue"
              name="營收"
              radius={[4, 4, 0, 0]}
              opacity={0.8}
            >
              {revenueWithMA.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getBarColor(entry.revenue_yoy)}
                  stroke={index === revenueWithMA.length - 1 ? '#000' : 'none'}
                  strokeWidth={index === revenueWithMA.length - 1 ? 1 : 0}
                />
              ))}
              <LabelList 
                dataKey="revenue" 
                position="top" 
                content={(props: { x?: number | string; y?: number | string; width?: number | string; value?: unknown; index?: number }) => {
                  const { x, y, width, value, index } = props;
                  const isLast = index === revenueWithMA.length - 1;
                  if (!isLast || x === undefined || y === undefined || width === undefined) return null;
                  return (
                    <text 
                      x={Number(x) + Number(width) / 2} 
                      y={Number(y) - 10} 
                      textAnchor="middle" 
                      className="fill-slate-600 dark:fill-slate-400 text-[10px] font-bold"
                    >
                      {formatRevenue(Number(value || 0))}
                    </text>
                  );
                }}
              />
            </Bar>

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
      </div>
    </div>
  );
}
