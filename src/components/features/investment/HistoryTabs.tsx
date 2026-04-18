'use client';

import React, { useState } from 'react';
import { StockWeightCrossEtfChart } from './StockWeightCrossEtfChart';
import { EtfRankingHistoryChart } from './EtfRankingHistoryChart';
import { EtfOverlapTrendChart } from './EtfOverlapTrendChart';
import type { WeightHistoryRow } from '@/app/investment/history/page';
import type { EtfRegistryEntry } from '@/lib/investment/etfRegistry';

interface OverlapTrendRow {
    date: string;
    total: number;
    shared2: number;
    shared3: number;
    shared5: number;
    shared7: number;
    pct2: number;
    pct3: number;
    pct5: number;
    pct7: number;
}

interface HistoryTabsProps {
    weightHistory: WeightHistoryRow[];
    overlapTrend: OverlapTrendRow[];
    stockList: { code: string; name: string }[];
    etfRegistry: EtfRegistryEntry[];
}

const TABS = [
    { id: 'cross-etf', label: '個股跨 ETF', desc: '某股在各家 ETF 的配置走勢' },
    { id: 'etf-ranking', label: '各 ETF 排名史', desc: 'Top N 持股的排名/權重歷史' },
    { id: 'overlap', label: '共識趨勢', desc: '多家共持股票比例隨時間的變化' },
] as const;

type TabId = typeof TABS[number]['id'];

export function HistoryTabs({ weightHistory, overlapTrend, stockList, etfRegistry }: HistoryTabsProps) {
    const [activeTab, setActiveTab] = useState<TabId>('cross-etf');

    // 從 weightHistory 計算最新日期各股被幾家 ETF 持有
    const latestOverlapStocks = React.useMemo(() => {
        if (weightHistory.length === 0) return [];
        const latestDate = weightHistory.reduce((max, r) => r.data_date > max ? r.data_date : max, '');
        const latest = weightHistory.filter(r => r.data_date === latestDate);
        // stock_code => Set of etf_codes
        const etfMap = new Map<string, { name: string; etfs: Set<string> }>();
        for (const r of latest) {
            const existing = etfMap.get(r.stock_code);
            if (existing) {
                existing.etfs.add(r.etf_code);
            } else {
                etfMap.set(r.stock_code, { name: r.stock_name, etfs: new Set([r.etf_code]) });
            }
        }
        return Array.from(etfMap.entries())
            .map(([code, v]) => ({ code, name: v.name, etfCount: v.etfs.size }))
            .sort((a, b) => b.etfCount - a.etfCount || a.code.localeCompare(b.code));
    }, [weightHistory]);

    return (
        <div className="space-y-6">
            {/* Tab 列 */}
            <div className="flex flex-wrap gap-2">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                            activeTab === tab.id
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200 dark:shadow-indigo-900/40'
                                : 'bg-white/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                        }`}
                    >
                        <span>{tab.label}</span>
                        {activeTab !== tab.id && (
                            <span className="ml-2 text-[10px] text-slate-400 dark:text-slate-500 hidden sm:inline">{tab.desc}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* 內容 */}
            {activeTab === 'cross-etf' && (
                <StockWeightCrossEtfChart
                    weightHistory={weightHistory}
                    stockList={stockList}
                    etfRegistry={etfRegistry}
                />
            )}
            {activeTab === 'etf-ranking' && (
                <EtfRankingHistoryChart
                    weightHistory={weightHistory}
                    etfRegistry={etfRegistry}
                />
            )}
            {activeTab === 'overlap' && (
                <EtfOverlapTrendChart
                    data={overlapTrend}
                    totalEtfs={etfRegistry.length}
                    etfCodes={etfRegistry.map(e => e.shortCode)}
                    overlapStocks={latestOverlapStocks}
                />
            )}
        </div>
    );
}
