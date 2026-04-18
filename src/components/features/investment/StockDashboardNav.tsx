'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NavStock, StockQuantMetrics } from '@/hooks/investment/useStockDashboard';
import { ETF_REGISTRY } from '@/lib/investment/etfRegistry';

const SORT_LABEL: Record<string, string> = {
    momentum_60d: '60日動能',
    it_buy_10d: '投信買超',
    filter_score: '動能分',
    revenue_yoy: 'YOY%',
    weight: '持股權重',
};

interface StockDashboardNavProps {
    stockCode: string;
    stockName: string;
    prevStock: NavStock | null;
    nextStock: NavStock | null;
    onNavigate: (code: string) => void;
    holdingEtfs?: string[];
    currentIndex?: number;
    totalCount?: number;
    quantMetrics?: StockQuantMetrics;
}

export function StockDashboardNav({ stockCode, stockName, prevStock, nextStock, onNavigate, holdingEtfs = [], currentIndex, totalCount, quantMetrics }: StockDashboardNavProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const sortField = searchParams.get('sort');
    const sortLabel = sortField ? SORT_LABEL[sortField] : null;

    return (
        <div className="mb-4">
            <div className="flex items-center justify-between mb-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/investment/00981A')}
                    className="flex items-center gap-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    返回投資總覽
                </Button>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={!prevStock}
                        onClick={() => prevStock && onNavigate(prevStock.code)}
                        className="flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {prevStock ? `上一檔 ${prevStock.name}` : '無'}
                    </Button>
                    {currentIndex != null && totalCount != null && totalCount > 0 && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 px-1 whitespace-nowrap">
                            {sortLabel ? `${sortLabel} 第${currentIndex}名` : `第${currentIndex}檔`}
                            <span className="text-slate-400 dark:text-slate-600"> / 共{totalCount}支</span>
                        </span>
                    )}
                    <Button
                        variant="default"
                        size="sm"
                        disabled={!nextStock}
                        onClick={() => nextStock && onNavigate(nextStock.code)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        {nextStock ? `下一檔 ${nextStock.name}` : '無'}
                        <ArrowRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-lg font-mono text-slate-600 dark:text-slate-400">
                        {stockCode}
                    </span>
                    {stockName || 'Loading...'}
                </h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        技術分析 • 基本面 • 籌碼分析
                    </p>
                    {quantMetrics && (
                        <>
                            <span className="text-slate-300 dark:text-slate-600">|</span>
                            {quantMetrics.momentum_60d !== null && (
                                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${
                                    quantMetrics.momentum_60d > 0
                                        ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                                        : 'bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
                                }`}>
                                    60日 {quantMetrics.momentum_60d > 0 ? '+' : ''}{quantMetrics.momentum_60d.toFixed(1)}%
                                </span>
                            )}
                            {quantMetrics.it_buy_10d !== null && (
                                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${
                                    quantMetrics.it_buy_10d > 0
                                        ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                                        : 'bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
                                }`}>
                                    投信 {quantMetrics.it_buy_10d > 0 ? '+' : ''}{(quantMetrics.it_buy_10d / 1000).toFixed(0)}K
                                </span>
                            )}
                            {quantMetrics.revenue_yoy !== null && (
                                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${
                                    quantMetrics.revenue_yoy >= 50
                                        ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                                        : quantMetrics.revenue_yoy < 0
                                        ? 'bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
                                        : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                                }`}>
                                    YOY {quantMetrics.revenue_yoy > 0 ? '+' : ''}{quantMetrics.revenue_yoy.toFixed(1)}%
                                </span>
                            )}
                        </>
                    )}
                    {holdingEtfs.length > 0 && (
                        <>
                            <span className="text-slate-300 dark:text-slate-600">|</span>
                            <span className="text-xs text-slate-400 dark:text-slate-500">經理人持有：</span>
                            {holdingEtfs.map(code => {
                                const meta = ETF_REGISTRY.find(e => e.code === code);
                                return (
                                    <span
                                        key={code}
                                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                                        style={{
                                            backgroundColor: meta ? `${meta.color}20` : '#e2e8f0',
                                            color: meta?.color ?? '#64748b',
                                            border: `1px solid ${meta ? `${meta.color}40` : '#cbd5e1'}`,
                                        }}
                                        title={meta?.name}
                                    >
                                        {code}
                                    </span>
                                );
                            })}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
