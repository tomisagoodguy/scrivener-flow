'use client';

import Link from 'next/link';

export interface OverlapStock {
    code: string;
    name: string;
    consensusRank: number;
    yaojieRank: number;
    consensusList: string;
    yaojielist: string;
}

export function OverlapStrip({ stocks }: { stocks: OverlapStock[] }) {
    if (stocks.length === 0) return null;

    return (
        <div className="glass-card rounded-xl px-4 py-3 border-l-4 border-amber-400">
            <div className="flex items-center gap-2 mb-2.5">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                    ⚡ 共識 + 瑤姐 同步出手
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">{stocks.length} 檔</span>
            </div>
            <div className="flex flex-wrap gap-2">
                {stocks.map(s => (
                    <Link
                        key={s.code}
                        href={`/investment/stock/${s.code}?from=${encodeURIComponent('共識+瑤姐')}&rank=${s.consensusRank}&list=${encodeURIComponent(s.consensusList)}`}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors group"
                    >
                        <span className="font-mono text-xs text-indigo-500 dark:text-indigo-400 group-hover:underline">
                            {s.code}
                        </span>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {s.name}
                        </span>
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 font-semibold">
                            共識#{s.consensusRank}
                        </span>
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-semibold">
                            瑤姐#{s.yaojieRank}
                        </span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
