'use client';

import React, { useEffect, useState } from 'react';
import { getStockManagerPnl } from '@/app/actions/investmentPnl';
import type { StockPnlResult } from '@/app/actions/investmentPnl';
import { ManagerPnlCard, ManagerPnlCardSkeleton } from './ManagerPnlCard';

interface ManagerPnlSectionProps {
    stockCode: string;
}

export function ManagerPnlSection({ stockCode }: ManagerPnlSectionProps) {
    const [results, setResults] = useState<StockPnlResult[] | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        setResults(null);
        setError(false);
        getStockManagerPnl(stockCode)
            .then(setResults)
            .catch(() => setError(true));
    }, [stockCode]);

    // Task 5.3: no holding ETFs → hide section
    if (results !== null && results.length === 0) return null;

    return (
        <div className="col-span-1 lg:col-span-2 space-y-4">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                📊 經理人損益
            </h2>

            {/* Task 5.3: error fallback */}
            {error && (
                <div className="text-sm text-slate-400 py-4 text-center glass-card rounded-xl p-4">
                    損益資料載入失敗
                </div>
            )}

            {/* Task 5.2: 2-column grid, each ETF one card */}
            {!error && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {results === null
                        // Task 5.3: skeleton while loading
                        ? [0, 1].map(i => <ManagerPnlCardSkeleton key={i} />)
                        : results.map(r => (
                            <ManagerPnlCard
                                key={r.etfCode}
                                result={r}
                                showEtfLabel={true}
                            />
                        ))
                    }
                </div>
            )}
        </div>
    );
}
