'use client';

import React, { useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';

interface RankingData {
    date: string;
    [key: string]: string | number;
}

interface RankingTrendChartProps {
    data: any[];
}

export function RankingTrendChart({ data }: RankingTrendChartProps) {
    // 處理資料：將原始 snapshot 資料轉換為 Recharts 格式
    // 格式應為: [{ date: '2024-01-01', '台積電': 1, '聯發科': 2 }, ...]
    
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];

        // Pre-process: Ensure numeric weights and normalized fields
        // Normalize date to YYYY-MM-DD to ensure matching
        const normalizeDate = (d: any) => {
             if (!d) return '';
             return String(d).substring(0, 10);
        };

        const processedData = data.map(d => ({
            ...d,
            data_date: normalizeDate(d.data_date),
            stock_code: String(d.stock_code).trim(),
            stock_name: String(d.stock_name).trim(),
            weight: Number(d.weight) || 0
        }));

        // Data Integrity Check: Filter out dates with too few records (likely scrape failures)
        const dateCounts = processedData.reduce((acc, curr) => {
            acc[curr.data_date] = (acc[curr.data_date] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        const validThreshold = 5; // A valid ETF snapshot should definitely have more than 5 holdings
        const validDates = new Set(Object.keys(dateCounts).filter(d => dateCounts[d] >= validThreshold));
        
        const validProcessedData = processedData.filter(d => validDates.has(d.data_date));

        const uniqueFullDates = [...new Set(validProcessedData.map(d => d.data_date))].sort();
        const latestDate = uniqueFullDates[uniqueFullDates.length - 1];
        
        if (!latestDate) return [];

        const topStocks = validProcessedData
            .filter(d => d.data_date === latestDate)
            .sort((a, b) => b.weight - a.weight)
            .slice(0, 10)
            .map(d => ({ code: d.stock_code, name: d.stock_name }));

        // 建立資料點
        const result = uniqueFullDates.map(fullDate => {
            // Display Label: MM-DD
            const dateLabel = fullDate.length >= 10 ? fullDate.substring(5, 10) : fullDate;
            const point: any = { date: dateLabel, _fullDate: fullDate };
            
            const dayData = validProcessedData.filter(d => d.data_date === fullDate);
            const dayRanks = [...dayData]
                .sort((a, b) => b.weight - a.weight)
                .map((d, index) => ({ code: d.stock_code, rank: index + 1 }));

            topStocks.forEach(s => {
                const stockRank = dayRanks.find(dr => dr.code === s.code);
                point[s.name] = stockRank ? stockRank.rank : null;
            });

            return point;
        });

        // 如果只有一筆資料，Mock 兩個點讓線條出現
        if (result.length === 1) {
            const realPoint = result[0];
            const mockPoints = [
                 { ...realPoint, date: '起始' },
                 realPoint
            ];
             return mockPoints;
        }

        return result;
    }, [data]);

     const topStockNames = useMemo(() => {
        if (!data || data.length === 0) return [];
        
        // Use logic consistent with above
        const normalizeDate = (d: any) => String(d || '').substring(0, 10);

        const processedData = data.map(d => ({ 
            ...d, 
            data_date: normalizeDate(d.data_date),
            stock_name: String(d.stock_name).trim(), 
            weight: Number(d.weight) || 0 
        }));
        
        // Data Integrity Check (Copy of above logic)
        const dateCounts = processedData.reduce((acc, curr) => {
            acc[curr.data_date] = (acc[curr.data_date] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        const validDates = new Set(Object.keys(dateCounts).filter(d => dateCounts[d] >= 5));
        const validProcessedData = processedData.filter(d => validDates.has(d.data_date));
        
        const uniqueFullDates = [...new Set(validProcessedData.map(d => d.data_date))].sort();
        const latestDate = uniqueFullDates[uniqueFullDates.length - 1];
        
        if (!latestDate) return [];

        return validProcessedData
            .filter(d => d.data_date === latestDate)
            .sort((a, b) => b.weight - a.weight)
            .slice(0, 10)
            .map(d => d.stock_name);
    }, [data]);

    if (!chartData || chartData.length === 0) {
         return (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
                <div className="h-[280px] w-full flex items-center justify-center text-slate-400">
                    尚無足夠排名的歷史數據
                </div>
            </div>
         );
    }

    const colors = [
        '#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', 
        '#06b6d4', '#ec4899', '#f97316', '#14b8a6', '#64748b'
    ];

    return (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
                    前十大持股排名走勢
                    <span className="text-[10px] font-normal text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded ml-2">
                        (排名越小表現越佳)
                    </span>
                </h3>
            </div>
            
            <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                        <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 11, fill: '#94a3b8' }}
                            axisLine={false}
                            tickLine={false}
                            interval={0}
                            padding={{ left: 10, right: 10 }}
                        />
                        <YAxis 
                            reversed 
                            domain={[1, 'auto']} 
                            tick={{ fontSize: 11, fill: '#94a3b8' }}
                            axisLine={false}
                            tickLine={false}
                            width={25}
                        />
                        <Tooltip 
                            contentStyle={{ 
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                borderRadius: '12px',
                                border: 'none',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                fontSize: '12px'
                            }}
                        />
                        <Legend 
                            verticalAlign="top" 
                            align="right" 
                            iconType="circle"
                            wrapperStyle={{ fontSize: '10px', paddingBottom: '20px' }}
                        />
                        {topStockNames.map((name, index) => (
                            <Line
                                key={name}
                                type="monotone"
                                dataKey={name}
                                stroke={colors[index % colors.length]}
                                strokeWidth={3}
                                dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                                activeDot={{ r: 6, strokeWidth: 0 }}
                                connectNulls
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
