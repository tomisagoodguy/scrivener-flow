'use client';

import React, { useState } from 'react';
import { StockWeightCrossEtfChart } from './StockWeightCrossEtfChart';
import { EtfRankingHistoryChart } from './EtfRankingHistoryChart';
import { EtfOverlapTrendChart } from './EtfOverlapTrendChart';
import type { WeightHistoryRow } from '@/app/investment/history/page';
import type { EtfRegistryEntry } from '@/lib/investment/etfRegistry';
import { getEtfWeightHistory90d, getStockWeightHistory90d } from '@/app/actions/getWeightHistory';
import { useOnDemandWeightHistory } from '@/hooks/investment/useOnDemandWeightHistory';

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
    /** 每支 ETF 最新一天的持股 */
    latestHoldings: WeightHistoryRow[];
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

export function HistoryTabs({ latestHoldings, overlapTrend, stockList, etfRegistry }: HistoryTabsProps) {
    const [activeTab, setActiveTab] = useState<TabId>('cross-etf');
    const stockHistory = useOnDemandWeightHistory(getStockWeightHistory90d);
    const etfHistory = useOnDemandWeightHistory(getEtfWeightHistory90d);

    // 各股被幾家 ETF 持有（以每支 ETF 各自的最新一日計）
    const latestOverlapStocks = React.useMemo(() => {
        // stock_code => Set of etf_codes
        const etfMap = new Map<string, { name: string; etfs: Set<string> }>();
        for (const r of latestHoldings) {
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
    }, [latestHoldings]);

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
                    weightHistory={stockHistory.rows}
                    stockList={stockList}
                    etfRegistry={etfRegistry}
                    onSelectionChange={stockHistory.select}
                    loading={stockHistory.loading}
                    error={stockHistory.error}
                />
            )}
            {activeTab === 'etf-ranking' && (
                <EtfRankingHistoryChart
                    weightHistory={etfHistory.rows}
                    etfRegistry={etfRegistry}
                    onSelectionChange={etfHistory.select}
                    loading={etfHistory.loading}
                    error={etfHistory.error}
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
