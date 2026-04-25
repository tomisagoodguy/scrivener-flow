'use client';

import { useState } from 'react';
import { EtfComparePanel, EtfData, OverlapData } from './EtfComparePanel';
import { AumScalePanel } from './AumScalePanel';

type Tab = 'holdings' | 'aum';

const TABS: { id: Tab; label: string }[] = [
    { id: 'holdings', label: '持股交集' },
    { id: 'aum',      label: '規模分析' },
];

export function ComparePageTabs({ etfs, overlap }: { etfs: EtfData[]; overlap: OverlapData }) {
    const [tab, setTab] = useState<Tab>('holdings');

    return (
        <div className="space-y-4">
            <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl w-fit">
                {TABS.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                            tab === t.id
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'holdings'
                ? <EtfComparePanel etfs={etfs} overlap={overlap} />
                : <AumScalePanel />
            }
        </div>
    );
}
