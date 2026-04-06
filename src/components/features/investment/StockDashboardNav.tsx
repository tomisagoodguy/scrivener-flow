'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NavStock } from '@/hooks/investment/useStockDashboard';

interface StockDashboardNavProps {
    stockCode: string;
    stockName: string;
    prevStock: NavStock | null;
    nextStock: NavStock | null;
    onNavigate: (code: string) => void;
}

export function StockDashboardNav({ stockCode, stockName, prevStock, nextStock, onNavigate }: StockDashboardNavProps) {
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
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    技術分析 • 基本面 • 籌碼分析
                </p>
            </div>
        </div>
    );
}
