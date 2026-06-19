'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ETF_REGISTRY } from '@/lib/investment/etfRegistry';
import { ArrowLeftIcon } from 'lucide-react';

interface EtfSelectorProps {
    currentEtf: string;
    mode?: 'drilldown' | 'pool';
    /**
     * 有資料的 ETF code 清單。提供時，drilldown switcher 只渲染這些 code 的按鈕；
     * 省略（undefined）時渲染全部 registry 項目（維持舊行為）。空陣列代表「無 active」，
     * 會渲染零顆按鈕——不等同於省略。
     */
    activeCodes?: string[];
}

const ETF_TAILWIND_COLORS: Record<string, string> = {
    '00981A': 'bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-700',
    '00980A': 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700',
    '00991A': 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700',
};

const DEFAULT_COLOR = 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600';

export function EtfSelector({ currentEtf, mode = 'drilldown', activeCodes }: EtfSelectorProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    if (mode === 'pool') {
        return (
            <Link
                href="/investment"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border bg-white/60 text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700 dark:hover:text-indigo-400 transition-all"
            >
                <ArrowLeftIcon className="w-3.5 h-3.5" />
                返回選股池
            </Link>
        );
    }

    const handleChange = (etfCode: string) => {
        const currentTab = searchParams.get('tab');
        const tabSuffix = currentTab ? `?tab=${currentTab}` : '';
        router.push(`/investment/${etfCode}${tabSuffix}`);
    };

    const activeSet = activeCodes !== undefined ? new Set(activeCodes) : null;
    const visibleEntries = activeSet ? ETF_REGISTRY.filter(etf => activeSet.has(etf.code)) : ETF_REGISTRY;

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {visibleEntries.map((etf) => {
                const isActive = currentEtf === etf.code;
                const colorClass = ETF_TAILWIND_COLORS[etf.code] ?? DEFAULT_COLOR;
                return (
                    <button
                        key={etf.code}
                        onClick={() => handleChange(etf.code)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 ${
                            isActive
                                ? colorClass + ' shadow-sm scale-105'
                                : 'bg-white/60 text-slate-500 border-slate-200 hover:border-slate-300 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700'
                        }`}
                    >
                        {etf.shortCode}
                        <span className="hidden sm:inline ml-1 opacity-80">· {etf.name}</span>
                    </button>
                );
            })}
        </div>
    );
}
