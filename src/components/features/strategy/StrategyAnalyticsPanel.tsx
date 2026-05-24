'use client';

import { useState } from 'react';
import type { StrategyAnalyticsData } from '@/app/actions/getStrategyAnalytics';
import StrategyHeatmap from './StrategyHeatmap';
import StrategySectorRanking from './StrategySectorRanking';
import StrategyVolumeRanking from './StrategyVolumeRanking';

type Period = '1d' | '5d' | '20d';

const PERIOD_LABELS: Record<Period, string> = {
    '1d': '日',
    '5d': '週',
    '20d': '月',
};

interface Props {
    data: StrategyAnalyticsData;
}

export default function StrategyAnalyticsPanel({ data }: Props) {
    const [period, setPeriod] = useState<Period>('1d');
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className="glass-card p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">策略股分析</h2>
                    <div className="flex rounded-lg overflow-hidden border border-gray-200/50 dark:border-white/10">
                        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-3 py-1 text-xs font-medium transition-colors ${
                                    period === p
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-500 hover:bg-gray-100/50 dark:hover:bg-white/10'
                                }`}
                            >
                                {PERIOD_LABELS[p]}
                            </button>
                        ))}
                    </div>
                    <span className="text-xs text-gray-400">{data.stocks.length} 支策略命中股</span>
                </div>
                <button
                    onClick={() => setCollapsed((c) => !c)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs px-2 py-1 rounded hover:bg-gray-100/50 transition-colors"
                >
                    {collapsed ? '展開 ▼' : '收起 ▲'}
                </button>
            </div>

            {!collapsed && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                    {/* Heatmap — takes 2 columns on xl */}
                    <div className="xl:col-span-2">
                        <p className="text-xs text-gray-400 mb-2">策略股熱力圖（大小=成交金額，色=漲跌幅）</p>
                        <StrategyHeatmap stocks={data.stocks} period={period} />
                    </div>

                    {/* Right column: sector ranking + volume ranking */}
                    <div className="space-y-4">
                        <div>
                            <p className="text-xs text-gray-400 mb-2">族群漲跌排行</p>
                            <StrategySectorRanking sectorRanking={data.sectorRanking} period={period} />
                        </div>
                        <div className="border-t border-white/20 pt-4">
                            <p className="text-xs text-gray-400 mb-2">成交金額排行 Top 15</p>
                            <StrategyVolumeRanking stocks={data.stocks} period={period} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
