import React, { useMemo } from 'react';
import Link from 'next/link';
import { DemoCase } from '@/types';
import { getCaseStage } from '@/lib/stageUtils';

interface GlobalPipelineChartProps {
    cases: DemoCase[];
    currentStage?: string;
}

const STAGES = [
    { id: 'contract', label: '簽約', color: 'bg-blue-500', icon: '✍️' },
    { id: 'seal', label: '用印', color: 'bg-indigo-500', icon: '印' },
    { id: 'tax', label: '完稅', color: 'bg-emerald-500', icon: '稅' },
    { id: 'transfer', label: '過戶', color: 'bg-purple-500', icon: '過' },
    { id: 'handover', label: '交屋', color: 'bg-red-500', icon: '交' },
];

export default function GlobalPipelineChart({ cases, currentStage }: GlobalPipelineChartProps) {
    const stageData = useMemo(() => {
        const counts = {
            contract: 0,
            seal: 0,
            tax: 0,
            transfer: 0,
            handover: 0,
        };

        cases.forEach((c) => {
            const stage = getCaseStage(c);
            if (stage !== 'closed' && counts.hasOwnProperty(stage)) {
                counts[stage as keyof typeof counts]++;
            }
        });

        return counts;
    }, [cases]);

    return (
        <div className="bg-card border border-border p-2 rounded-lg shadow-sm mb-2 overflow-x-auto ring-1 ring-border/5">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="text-[11px] font-black text-foreground flex items-center gap-1">
                        <span className="text-xs">📊</span> 流程監控
                        <span className="text-[8px] text-foreground/30 font-bold border-l border-border pl-1 ml-1 hidden sm:inline">點擊圓圈篩選</span>
                    </h3>
                </div>
                {currentStage ? (
                    <Link
                        href="/cases"
                        className="text-sm font-bold text-white bg-red-500 hover:bg-red-600 px-4 py-2 rounded-xl shadow-lg shadow-red-500/30 flex items-center gap-2 transition-all transform hover:scale-105"
                    >
                        <span>✖ 清除篩選 ({STAGES.find((s) => s.id === currentStage)?.label})</span>
                    </Link>
                ) : (
                    <div className="hidden md:flex items-center gap-2 bg-secondary/20 px-1.5 py-0.5 rounded border border-border">
                        <span className="text-[8px] text-foreground/40 font-black uppercase">Processing</span>
                        <span className="text-sm font-black text-primary leading-none">
                            {Object.values(stageData).reduce((a, b) => a + b, 0)}
                        </span>
                    </div>
                )}
            </div>

            {/* Adjusted container to fit all steps without massive scrolling */}
            <div className="flex items-center justify-between w-full px-2 py-2 overflow-x-auto">
                {STAGES.map((stage, idx) => {
                    const count = stageData[stage.id as keyof typeof stageData] || 0;
                    const isLast = idx === STAGES.length - 1;
                    const isActive = currentStage === stage.id;
                    const isInactive = currentStage && !isActive;

                    return (
                        <React.Fragment key={stage.id}>
                            <Link
                                href={isActive ? '/cases' : `/cases?stage=${stage.id}`}
                                className={`flex flex-col items-center shrink-0 group focus:outline-none transition-opacity ${isInactive ? 'opacity-40 hover:opacity-100' : 'opacity-100'}`}
                            >
                                <div
                                    className={`
                                    relative w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-white font-black text-[10px] md:text-xs shadow-md border ring-1 transition-all duration-300
                                    ${count > 0 ? stage.color : 'bg-slate-200 text-slate-400'}
                                    ${isActive ? 'ring-primary scale-110 border-primary' : 'border-white ring-slate-100 group-hover:scale-105'}
                                `}
                                >
                                    {stage.icon}
                                    {count > 0 && (
                                        <div
                                            className={`absolute -top-1 -right-1 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black animate-bounce shadow-md ${currentStage === stage.id ? 'bg-primary' : 'bg-red-600'}`}
                                        >
                                            {count}
                                        </div>
                                    )}
                                </div>
                                <div className="mt-1 text-center">
                                    <div
                                        className={`text-[9px] md:text-[10px] font-black transition-colors ${isActive ? 'text-primary scale-110' : count > 0 ? 'text-foreground group-hover:text-primary' : 'text-foreground/30'}`}
                                    >
                                        {stage.label}
                                    </div>
                                </div>
                            </Link>

                            {!isLast && (
                                <div className="grow flex flex-col items-center justify-center px-0.5 -mt-2.5 md:-mt-3.5 min-w-[8px] relative">
                                    <div className="flex items-center w-full opacity-30">
                                        <div
                                            className={`h-0.5 w-full rounded-full transition-colors ${count > 0 ? 'bg-slate-300' : 'bg-slate-100'
                                                }`}
                                        >
                                            <div
                                                className={`h-full rounded-full ${stage.color}`}
                                                style={{ width: count > 0 ? '100%' : '0%' }}
                                            ></div>
                                        </div>
                                    </div>
                                    {stage.id === 'contract' && (
                                        <div className="absolute top-1 w-[80px] flex justify-center pointer-events-none">
                                            <div className="text-[7px] font-bold text-slate-400 bg-slate-50/90 backdrop-blur-[2px] border border-slate-200/40 px-1 py-0 rounded-full whitespace-nowrap z-10">
                                                謄本/現值
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            <div className="mt-1 flex justify-center border-t border-slate-100 pt-1">
                <span className="text-[8px] font-bold text-foreground/30">
                    💡 點擊圓圈篩選案件
                </span>
            </div>
        </div>
    );
}
