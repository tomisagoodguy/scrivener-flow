"use client";

import React from 'react';
import {
    BarChart,
    ComposedChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    LineChart,
    Line,
    Legend
} from 'recharts';
import { Holding } from '@/types/investment';

interface HoldingsOverviewProps {
    data: Holding[];
}

/**
 * 投資組合視覺化概覽
 * 呈現持股權重分佈與產業/標的表現
 */
export function HoldingsOverview({ data }: HoldingsOverviewProps) {
    // 過濾並排序前 15 大持股進行呈現
    const topHoldings = [...data]
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 15);

    // 格式化億元
    const formatBillions = (value: number) => {
        return `${(value / 1e8).toFixed(1)}億`;
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* 1. 權重分佈圖 (長條圖) */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
                        前 15 大持股權重 (%)
                    </h3>
                </div>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={topHoldings}
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.1} />
                            <XAxis type="number" hide />
                            <YAxis 
                                dataKey="stock_name" 
                                type="category" 
                                tick={{ fontSize: 11, fill: '#64748b' }} 
                                width={80}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                    borderRadius: '12px',
                                    border: 'none',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                }}
                                formatter={(value: number | string | any) => [`${Number(value).toFixed(2)}%`, '投組權重']}
                            />
                            <Bar 
                                dataKey="weight" 
                                radius={[0, 4, 4, 0]}
                                barSize={12}
                            >
                                {topHoldings.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index < 5 ? '#6366f1' : '#94a3b8'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 2. 營收成長 YoY & MoM (複合圖) */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div>
                        營收成長 (YoY / MoM)
                    </h3>
                </div>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                            data={topHoldings}
                            margin={{ top: 20, right: 10, left: 10, bottom: 60 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                            <XAxis 
                                dataKey="stock_name" 
                                angle={-45} 
                                textAnchor="end" 
                                interval={0}
                                tick={{ fontSize: 10, fill: '#64748b' }}
                                height={60}
                            />
                            <YAxis 
                                tick={{ fontSize: 11, fill: '#64748b' }} 
                                label={{ value: '%', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#94a3b8' } }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                    borderRadius: '12px',
                                    border: 'none',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                }}
                                formatter={(value: number | string | any, name: any) => [`${Number(value || 0).toFixed(1)}%`, name]}
                            />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                            <Bar 
                                dataKey="revenue_yoy" 
                                name="YoY 年增率"
                                radius={[4, 4, 0, 0]}
                                barSize={20}
                            >
                                {topHoldings.map((entry, index) => (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={(entry.revenue_yoy || 0) > 0 ? '#ef4444' : '#22c55e'} 
                                        fillOpacity={0.8}
                                    />
                                ))}
                            </Bar>
                            <Line
                                type="monotone"
                                dataKey="revenue_mom"
                                name="MoM 月增率"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
                                activeDot={{ r: 5 }}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
