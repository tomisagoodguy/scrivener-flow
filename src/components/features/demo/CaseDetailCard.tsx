'use client';

import React from 'react';
import { DemoCase } from '@/types';

interface CaseDetailCardProps {
    currentCase: DemoCase;
    formatDate: (isoStr?: string) => string;
}

export function CaseDetailCard({ currentCase, formatDate }: CaseDetailCardProps) {
    return (
        <div className="max-w-6xl mx-auto space-y-4 animate-fade-in">
            {/* Case Header Card */}
            <div className="bg-(--surface) border border-border rounded-sm overflow-hidden shadow-xl">
                <div className="bg-slate-800 dark:bg-slate-900 border-b border-border p-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="text-xs font-mono bg-black/40 px-2 py-1 rounded text-primary">
                            {currentCase.case_number}
                        </div>
                        <h2 className="text-2xl font-black">
                            {currentCase.city}
                            {currentCase.district} • {currentCase.buyer_name}
                        </h2>
                    </div>
                    <div className="flex gap-2">
                        <span className="text-[10px] font-bold uppercase py-1 px-3 bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30">
                            承辦: {currentCase.handler || '團隊'}
                        </span>
                        <span className="text-[10px] font-bold uppercase py-1 px-3 bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
                            {currentCase.status}
                        </span>
                    </div>
                </div>

                {/* Today's Special Detail - Excel's "今日須完成" */}
                <div className="p-4 bg-orange-500/10 border-b border-orange-500/20 flex items-center gap-4">
                    <span className="bg-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase">
                        實務細節
                    </span>
                    <div className="font-bold text-sm text-orange-500">
                        {currentCase.today_completion || '舊制(本戶 / 資料補件中)'}
                    </div>
                </div>

                {/* Grid for Master Content */}
                <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x border-border divide-border">
                    {/* People */}
                    <div className="p-4 space-y-4">
                        <div>
                            <div className="text-[9px] font-bold opacity-40 uppercase tracking-tighter mb-1">
                                關係人資訊
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-baseline">
                                    <span className="text-xs opacity-60">買方</span>{' '}
                                    <span className="font-bold">{currentCase.buyer_name}</span>
                                </div>
                                <div className="flex justify-between items-baseline">
                                    <span className="text-xs opacity-60">賣方</span>{' '}
                                    <span className="font-bold">{currentCase.seller_name}</span>
                                </div>
                                <div className="flex justify-between items-baseline">
                                    <span className="text-xs opacity-60">案源</span>{' '}
                                    <span className="text-sm">{currentCase.agent_name || '--'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Dates - The "Case Progress" row */}
                    <div className="p-4 md:col-span-2">
                        <div className="text-[9px] font-bold opacity-40 uppercase tracking-tighter mb-3">
                            進度時程記錄
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            {(() => {
                                const m = (currentCase.milestones?.[0] || {}) as any;
                                return [
                                    {
                                        label: '簽約',
                                        date: m.contract_date,
                                        color: 'border-blue-500/30 bg-blue-500/5',
                                    },
                                    { label: '簽差', date: m.sign_diff_date, color: 'border-slate-500/30' },
                                    { label: '用印', date: m.seal_date, color: 'border-purple-500/30' },
                                    {
                                        label: '預收',
                                        date: m.fee_precollect_date,
                                        color: 'border-slate-500/30',
                                    },
                                    {
                                        label: '完稅',
                                        date: m.tax_payment_date,
                                        color: 'border-amber-500/30 bg-amber-500/5',
                                    },
                                    {
                                        label: '交屋',
                                        date: m.handover_date,
                                        color: 'border-emerald-500/30 bg-emerald-500/5',
                                    },
                                ].map((d, i) => (
                                    <div key={i} className={`p-2 border rounded-sm ${d.color}`}>
                                        <div className="text-[9px] font-bold opacity-50 mb-1">
                                            {d.label}
                                        </div>
                                        <div className="font-mono text-xs font-bold tracking-tighter">
                                            {formatDate(d.date)}
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>

                    {/* Financials / Loans */}
                    <div className="p-4 space-y-4">
                        <div>
                            <div className="text-[9px] font-bold opacity-40 uppercase tracking-tighter mb-1">
                                貸款與類型
                            </div>
                            <div className="space-y-3">
                                {(() => {
                                    const f = (currentCase.financials?.[0] || {}) as any;
                                    return (
                                        <>
                                            <div>
                                                <div className="text-[10px] font-bold text-sky-500">
                                                    B貸款 (買方)
                                                </div>
                                                <div className="text-xs font-medium truncate">
                                                    {f.buyer_bank || '尚未核貸'}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-bold text-rose-500">
                                                    S貸款 (賣方)
                                                </div>
                                                <div className="text-xs font-medium truncate">
                                                    {f.seller_bank || '無貸款'}
                                                </div>
                                            </div>
                                            <div className="pt-2 border-t border-border flex justify-between">
                                                <span className="text-[10px] opacity-40">稅費類型</span>
                                                <span className="text-[10px] font-bold">
                                                    {f.vat_type || '一般'}
                                                </span>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Notes (Excel's Remarks) */}
                <div className="bg-slate-100 dark:bg-black/20 p-4 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex gap-3">
                        <span className="text-[10px] font-bold opacity-30 mt-0.5">備註:</span>
                        <p className="text-sm opacity-70 leading-relaxed">{currentCase.notes || '--'}</p>
                    </div>
                    <div className="flex gap-3 border-l-0 md:border-l border-border md:pl-4">
                        <span className="text-[10px] font-bold text-primary mt-0.5">其他備註:</span>
                        <p className="text-sm text-primary/80 font-medium leading-relaxed italic">
                            {currentCase.other_notes || '目前尚無代償計畫'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Bottom Master View Statistics (Optional Excel feel) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-(--surface) border border-border rounded-sm">
                    <div className="text-[9px] font-bold opacity-40 uppercase">總成交金額估算</div>
                    <div className="text-xl font-black text-emerald-500 mt-1">
                        ${((currentCase.financials?.[0] as any)?.total_price || 0).toLocaleString()}
                    </div>
                </div>
            </div>
        </div>
    );
}
