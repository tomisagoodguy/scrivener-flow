'use client';

import { useRouter } from 'next/navigation';

type Tab = 'market' | 'watchlist';

interface TabSwitcherProps {
    currentTab: Tab;
}

export default function TabSwitcher({ currentTab }: TabSwitcherProps) {
    const router = useRouter();

    const tabs: { id: Tab; label: string }[] = [
        { id: 'market', label: '全市場' },
        { id: 'watchlist', label: '自選股' },
    ];

    return (
        <div className="flex items-center gap-1 bg-slate-100/60 dark:bg-slate-800/60 rounded-xl p-1 w-fit">
            {tabs.map((tab) => {
                const isActive = currentTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => router.push(`/investment/consensus-signal?tab=${tab.id}`)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                            isActive
                                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
}
