'use client';

import { useState } from 'react';
import { EtfComparePanel, type EtfData, type OverlapData } from './EtfComparePanel';
import { EtfOverlapStockTable } from './EtfOverlapStockTable';

type ViewMode = 'card' | 'table';

export function EtfCompareViewTabs({ etfs, overlap }: { etfs: EtfData[]; overlap: OverlapData }) {
    const [view, setView] = useState<ViewMode>('card');

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <button
                    onClick={() => setView('card')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${view === 'card'
                        ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/60'}`}
                >
                    卡片視圖
                </button>
                <button
                    onClick={() => setView('table')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${view === 'table'
                        ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/60'}`}
                >
                    表格視圖
                </button>
            </div>
            {view === 'card'
                ? <EtfComparePanel etfs={etfs} overlap={overlap} />
                : <EtfOverlapStockTable etfs={etfs} overlap={overlap} />}
        </div>
    );
}
