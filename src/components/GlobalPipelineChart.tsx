'use client';

import React, { useMemo } from 'react';
import { DemoCase } from '@/types';

interface GlobalPipelineChartProps {
    cases: DemoCase[];
}

const STAGES = [
    { id: 'contract', label: '簽約', color: 'bg-blue-500', icon: '✍️' },
    { id: 'seal', label: '用印', color: 'bg-indigo-500', icon: '印' },
    { id: 'tax', label: '完稅', color: 'bg-emerald-500', icon: '稅' },
    { id: 'balance', label: '尾款', color: 'bg-amber-500', icon: '尾' },
    { id: 'transfer', label: '過戶', color: 'bg-purple-500', icon: '過' },
    { id: 'handover', label: '交屋', color: 'bg-red-500', icon: '交' },
];

export default function GlobalPipelineChart({ cases }: GlobalPipelineChartProps) {
    const stageData = useMemo(() => {
        const counts = {
            contract: 0,
            seal: 0,
            tax: 0,
            balance: 0,
            transfer: 0,
            handover: 0,
        };

        cases.forEach(c => {
            const m = Array.isArray(c.milestones) ? c.milestones[0] : c.milestones;
            if (!m) {
                counts.contract++;
                return;
            }

            // Determine current stage based on the last completed milestone
            if (m.handover_date) return; // Finished
            if (m.transfer_date) { counts.handover++; return; }
            if (m.balance_payment_date) { counts.transfer++; return; }
            if (m.tax_payment_date) { counts.balance++; return; }
            if (m.seal_date) { counts.tax++; return; }
            if (m.contract_date) { counts.seal++; return; }
            counts.contract++;
        });

        return counts;
    }, [cases]);

    return (
        <div className="bg-white border-2 border-slate-300 p-6 shadow-sm mb-8 overflow-x-auto">
            <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                <span className="text-2xl">📊</span> 案件全流程監控 (Pipeline Status)
            </h3>

            <div className="flex items-center justify-between min-w-[900px]">
                {STAGES.map((stage, idx) => {
                    const count = stageData[stage.id as keyof typeof stageData] || 0;
                    const isLast = idx === STAGES.length - 1;

                    return (
                        <React.Fragment key={stage.id}>
                            <div className="flex flex-col items-center flex-1">
                                <div className={`
                                    relative w-16 h-16 rounded-full flex items-center justify-center text-white font-black text-xl shadow-lg border-4 border-white ring-2 ring-slate-100 transition-transform hover:scale-110 cursor-default
                                    ${count > 0 ? stage.color : 'bg-slate-200 text-slate-400'}
                                `}>
                                    {stage.icon}
                                    {count > 0 && (
                                        <div className="absolute -top-2 -right-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full font-black animate-bounce shadow-md">
                                            {count}
                                        </div>
                                    )}
                                </div>
                                <div className="mt-3 text-center">
                                    <div className={`text-[15px] font-black ${count > 0 ? 'text-slate-800' : 'text-slate-400'}`}>{stage.label}</div>
                                    <div className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Stage {idx + 1}</div>
                                </div>
                            </div>

                            {!isLast && (
                                <div className="flex-grow flex items-center justify-center px-4 -mt-10">
                                    <div className={`h-1.5 w-full rounded-full transition-colors ${count > 0 ? 'bg-slate-200' : 'bg-slate-100'}`}>
                                        <div className={`h-full rounded-full ${stage.color}`} style={{ width: count > 0 ? '70%' : '0%' }}></div>
                                    </div>
                                    <span className="text-slate-300 font-black ml-2">→</span>
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            <div className="mt-8 flex gap-6 justify-center">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-xs font-bold text-slate-600">正常辦理中</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                    <span className="text-xs font-bold text-slate-600">暫無案件於此階段</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                    <span className="text-xs font-bold text-slate-600">需要關注/即將到期</span>
                </div>
            </div>
        </div>
    );
}
