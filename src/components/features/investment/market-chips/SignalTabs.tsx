'use client';

import React, { useMemo, useState } from 'react';
import type { InstitutionalSignal, SignalType } from '@/app/actions/getMarketChips';
import { SignalTable } from './SignalTable';

interface SignalTabsProps {
    signals: InstitutionalSignal[];
}

const TABS: { type: SignalType; label: string }[] = [
    { type: 'dual_buy', label: '雙法人同買' },
    { type: 'consecutive_buy', label: '法人連買' },
    { type: 'divergence', label: '土洋分歧' },
];

export function SignalTabs({ signals }: SignalTabsProps) {
    const [active, setActive] = useState<SignalType>('dual_buy');

    const grouped = useMemo(() => {
        const map: Record<SignalType, InstitutionalSignal[]> = {
            dual_buy: [],
            consecutive_buy: [],
            divergence: [],
        };
        for (const s of signals) {
            map[s.signal_type].push(s);
        }
        return map;
    }, [signals]);

    return (
        <div>
            <div className="flex gap-1 mb-4 border-b border-slate-200 dark:border-slate-700">
                {TABS.map((tab) => (
                    <button
                        key={tab.type}
                        type="button"
                        onClick={() => setActive(tab.type)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                            active === tab.type
                                ? 'border-rose-500 text-rose-600 dark:text-rose-400'
                                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                    >
                        {tab.label}
                        <span className="ml-1.5 text-xs text-slate-400">({grouped[tab.type].length})</span>
                    </button>
                ))}
            </div>
            <SignalTable signals={grouped[active]} signalType={active} />
        </div>
    );
}
