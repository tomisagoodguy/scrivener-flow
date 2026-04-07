'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NavStock } from '@/hooks/investment/useStockDashboard';
import { ETF_REGISTRY } from '@/lib/investment/etfRegistry';

interface StockDashboardNavProps {
    stockCode: string;
    stockName: string;
    prevStock: NavStock | null;
    nextStock: NavStock | null;
    onNavigate: (code: string) => void;
    holdingEtfs?: string[];
    currentIndex?: number;
    totalCount?: number;
}

export function StockDashboardNav({ stockCode, stockName, prevStock, nextStock, onNavigate, holdingEtfs = [], currentIndex, totalCount }: StockDashboardNavProps) {
    const router = useRouter();

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
                        <span className="text-xs font-mono text-slate-500 dark:text-slate-400 px-1">
                            {currentIndex}/{totalCount}
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
