'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NavStock, StockQuantMetrics } from '@/hooks/investment/useStockDashboard';
import { ETF_REGISTRY } from '@/lib/investment/etfRegistry';

const SORT_LABEL: Record<string, string> = {
    momentum_60d: '60日動能',
    it_buy_5d: '投信買超',
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
    chipRank?: number | null;
    retailRank?: number | null;
}

export function StockDashboardNav({ stockCode, stockName, prevStock, nextStock, onNavigate, holdingEtfs = [], currentIndex, totalCount, quantMetrics, chipRank, retailRank }: StockDashboardNavProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const sortField = searchParams.get('sort');
    const source = searchParams.get('source');
    const isEquitySource = source === 'equity' || source === 'equity-retail';
    const isRetailSource = source === 'equity-retail';
    const sortLabel = isRetailSource ? '散戶排行' : isEquitySource ? '籌碼排行' : (sortField ? SORT_LABEL[sortField] : null);
    const backHref = isEquitySource ? '/investment/equity' : '/investment/00981A';

    return (
        <div className="mb-4">
            <div className="flex items-center justify-between mb-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(backHref)}
                    className="flex items-center gap-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    {isEquitySource ? '返回籌碼排行榜' : '返回投資總覽'}
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
                    <div className="flex flex-col items-center gap-0.5 px-1">
                        {currentIndex != null && totalCount != null && totalCount > 0 && (
                            <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                {sortLabel ? `${sortLabel} 第${currentIndex}名` : `第${currentIndex}檔`}
                                <span className="text-slate-400 dark:text-slate-600"> / 共{totalCount}支</span>
                            </span>
                        )}
                        {isEquitySource && chipRank != null && retailRank != null && (
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs px-1.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 whitespace-nowrap">
                                    主力 #{chipRank}
                                </span>
                                <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 whitespace-nowrap">
                                    散戶 #{retailRank}
                                </span>
                            </div>
                        )}
                    </div>
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
                            {/* M badge */}
                            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${
                                quantMetrics.momentum_pass
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
                                    : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700'
                            }`}>
                                M {quantMetrics.momentum_pass ? '✓' : '✗'}
                                {quantMetrics.momentum_60d !== null && (
                                    <span className="font-normal">{quantMetrics.momentum_60d > 0 ? '+' : ''}{quantMetrics.momentum_60d.toFixed(1)}%</span>
                                )}
                            </span>
                            {/* T badge */}
                            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${
                                quantMetrics.it_buy_5d_pass
                                    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
                                    : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700'
                            }`}>
                                T {quantMetrics.it_buy_5d_pass ? '✓' : '✗'}
                                {quantMetrics.it_buy_5d !== null && (
                                    <span className="font-normal">{quantMetrics.it_buy_5d > 0 ? '+' : ''}{(quantMetrics.it_buy_5d / 1000).toFixed(0)}K</span>
                                )}
                            </span>
                            {/* R badge */}
                            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${
                                quantMetrics.rev_ma3_new_high
                                    ? 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800'
                                    : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700'
                            }`}>
                                R {quantMetrics.rev_ma3_new_high ? '✓' : '✗'}
                                {quantMetrics.revenue_yoy !== null && (
                                    <span className="font-normal">YOY {quantMetrics.revenue_yoy > 0 ? '+' : ''}{quantMetrics.revenue_yoy.toFixed(1)}%</span>
                                )}
                            </span>
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
