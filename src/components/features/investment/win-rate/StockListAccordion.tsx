'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { WinRateBucket } from '@/types/revenuelab';

interface StockListAccordionProps {
    bucket: WinRateBucket;
    currentStockCodes?: string[];
}

export function StockListAccordion({ bucket, currentStockCodes }: StockListAccordionProps) {
    const [open, setOpen] = useState(false);
    const router = useRouter();

    if (!bucket.stocks || bucket.stocks.length === 0) return null;

    return (
        <div>
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline mt-1"
            >
                {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                查看 {bucket.stocks.length} 檔股票名單
            </button>
            {open && (
                <div className="mt-2 space-y-1">
                    {bucket.stocks.map((s) => {
                        const isAvailable = currentStockCodes?.includes(s.code);
                        return (
                            <div
                                key={s.code}
                                className="flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-slate-600 dark:text-slate-400">{s.code}</span>
                                    <span className="text-slate-700 dark:text-slate-300">{s.name}</span>
                                    <Badge variant="outline" className="text-[10px] py-0">
                                        連爆 {s.burstMonths} 月
                                    </Badge>
                                    {isAvailable ? (
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                const targetUrl = `?tab=analysis#stock-${s.code}`;
                                                router.push(targetUrl, { scroll: false });

                                                // 如果 Hash 沒變，手動觸發事件確保 InvestmentTabs 捲動
                                                if (window.location.hash === `#stock-${s.code}`) {
                                                    window.dispatchEvent(new HashChangeEvent('hashchange'));
                                                }
                                            }}
                                            className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-md text-indigo-600 transition-all active:scale-90 cursor-pointer shadow-sm border border-transparent hover:border-indigo-200"
                                            title="該標的目前在黃金區間，點擊查看策略洞察"
                                        >
                                            <Target className="w-3.5 h-3.5" />
                                        </button>
                                    ) : (
                                        <span
                                            className="p-1 text-slate-300 dark:text-slate-600 cursor-not-allowed"
                                            title="該標目前未在黃金成長區間明細中"
                                        >
                                            <Target className="w-3 h-3 opacity-30" />
                                        </span>
                                    )}
                                </div>
                                <span className={`font-bold ${s.annualReturn >= 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-500'}`}>
                                    {s.annualReturn >= 0 ? '+' : ''}{s.annualReturn.toFixed(1)}%
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
