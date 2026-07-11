'use client';

import React from 'react';
import { CalendarDays } from 'lucide-react';
import type { EtfDividendRecord } from '@/app/actions/getEtfMechanics';

interface DividendTimelineProps {
    dividends: EtfDividendRecord[];
}

/** 配息時間軸：期別 / 每單位金額 / 除息日標記；無記錄顯示明確空狀態。 */
export function DividendTimeline({ dividends }: DividendTimelineProps) {
    return (
        <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
                <CalendarDays className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">配息記錄</h3>
                <span className="text-xs text-slate-400">來源：TWSE ETF 分配收益公告</span>
            </div>
            {dividends.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    <p className="font-medium">無配息制度或尚無配息記錄</p>
                    <p className="mt-1 text-xs">累積型 ETF 不配息；新成立 ETF 可能尚未公告首次收益分配。</p>
                </div>
            ) : (
                <ol className="relative border-s border-slate-200 dark:border-slate-700 ms-2 space-y-5">
                    {[...dividends].reverse().map((d) => (
                        <li key={d.period} className="ms-5">
                            <span className="absolute -start-[5px] mt-1.5 w-2.5 h-2.5 rounded-full bg-amber-400 ring-4 ring-amber-100 dark:ring-amber-900/40" />
                            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{d.period} 期</span>
                                <span className="text-sm font-bold text-rose-600 dark:text-rose-400">每單位 {d.cashPerUnit} 元</span>
                                {d.yieldPct !== null && (
                                    <span className="text-xs text-slate-500">殖利率 {d.yieldPct.toFixed(2)}%</span>
                                )}
                            </div>
                            <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                除息 {d.exDate}
                                {d.payDate ? ` ・ 發放 ${d.payDate}` : ' ・ 發放日未公告'}
                            </div>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
}
