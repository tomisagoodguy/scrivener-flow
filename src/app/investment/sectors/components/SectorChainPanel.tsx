'use client';

import { useMemo } from 'react';
import { getStockChain } from '@/lib/investment/chainMap';

interface Props {
    stockIds: string[];
}


export function SectorChainPanel({ stockIds }: Props) {
    const chain = useMemo(() => getStockChain(stockIds), [stockIds]);

    if (chain.downstream.length === 0) return null;

    return (
        <div className="mt-3 pt-3 border-t border-white/20">
            <p className="text-xs text-gray-400 mb-2 font-medium tracking-wide uppercase">
                下游受惠族群
            </p>
            <div className="flex flex-wrap gap-1.5">
                {chain.downstream.map((g) => (
                    <span
                        key={g}
                        className="inline-flex items-center px-2 py-1 rounded-lg bg-white/40 dark:bg-white/10 border border-white/50 text-xs text-gray-700 dark:text-gray-200"
                    >
                        {g}
                    </span>
                ))}
            </div>
        </div>
    );
}
