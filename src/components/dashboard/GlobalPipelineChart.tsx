import React, { useMemo } from 'react';
import Link from 'next/link';
import { DemoCase } from '@/types';
import { getCaseStage } from '@/lib/stageUtils';
import { cn } from '@/lib/utils';

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
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm mb-6 overflow-x-auto ring-1 ring-border/5">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-base font-black text-foreground flex items-center gap-2">
                        <span className="text-lg">📊</span> 案件全流程監控 (Pipeline Status)
                    </h3>
                    <p className="text-xs text-foreground/50 font-bold mt-1 ml-7 flex items-center gap-1.5">
                        <span className="bg-primary/20 text-primary px-1 py-0.5 rounded text-[9px]">TIPS</span>
                        點擊圓圈可篩選下方案件
                    </p>
                </div>
                {currentStage ? (
                    <Link
                        href="/cases"
                        className="text-sm font-bold text-white bg-red-500 hover:bg-red-600 px-4 py-2 rounded-xl shadow-lg shadow-red-500/30 flex items-center gap-2 transition-all transform hover:scale-105"
                    >
                        <span>✖ 清除篩選 ({STAGES.find((s) => s.id === currentStage)?.label})</span>
                    </Link>
                ) : (
                    <div className="hidden md:block text-right bg-secondary/30 px-3 py-1.5 rounded-lg border border-border">
                        <div className="text-[9px] text-foreground/40 font-black uppercase tracking-wider">
                            Processing Cases
                        </div>
                        <div className="text-xl font-black text-primary leading-none mt-0.5">
                            {Object.values(stageData).reduce((a, b) => a + b, 0)}{' '}
                            <span className="text-xs text-foreground/30">件</span>
                        </div>
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
                                    relative w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center text-white font-black text-lg md:text-xl shadow-lg border-4 ring-2 transition-all duration-300
                                    ${count > 0 ? stage.color : 'bg-slate-200 text-slate-400'}
                                    ${isActive ? 'ring-primary scale-110 border-primary shadow-xl' : 'border-white ring-slate-100 group-hover:scale-105'}
                                `}
                                >
                                    {stage.icon}
                                    {count > 0 && (
                                        <div
                                            className={`absolute -top-2 -right-2 text-white text-xs px-2 py-1 rounded-full font-black animate-bounce shadow-md ${currentStage === stage.id ? 'bg-primary' : 'bg-red-600'}`}
                                        >
                                            {count}
                                        </div>
                                    )}
                                </div>
                                <div className="mt-2 text-center">
                                    <div
                                        className={`text-sm md:text-[15px] font-black transition-colors ${isActive ? 'text-primary scale-110' : count > 0 ? 'text-foreground group-hover:text-primary' : 'text-foreground/30'}`}
                                    >
                                        {stage.label}
                                    </div>
                                    <div className="hidden md:block text-[10px] text-foreground/40 font-bold uppercase tracking-widest mt-0.5 group-hover:text-foreground/60">
                                        Stage {idx + 1}
                                    </div>
                                </div>
                            </Link>

                            {!isLast && (
                                <div className="grow flex flex-col items-center justify-center px-1 md:px-2 -mt-6 md:-mt-8 min-w-[20px] relative">
                                    <div className="flex items-center w-full opacity-30">
                                        <div
                                            className={`h-1 w-full rounded-full transition-colors ${count > 0 ? 'bg-slate-300' : 'bg-slate-100'
                                                }`}
                                        >
                                            <div
                                                className={`h-full rounded-full ${stage.color}`}
                                                style={{ width: count > 0 ? '100%' : '0%' }}
                                            ></div>
                                        </div>
                                        <span className="text-slate-300 font-black ml-1 text-xs md:text-sm">
                                            →
                                        </span>
                                    </div>
                                    {stage.id === 'contract' && (
                                        <div className="absolute top-4 md:top-5 w-[140px] flex justify-center pointer-events-none">
                                            <div className="text-[10px] md:text-[11px] font-bold text-slate-400 bg-slate-50/90 backdrop-blur-[2px] border border-slate-200/60 px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap z-10">
                                                請謄本、預估、請現值
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            <div className="mt-8 flex gap-6 justify-center">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground/40 bg-secondary/50 px-2 py-1 rounded">
                        💡 點擊上方圓圈可篩選下方案件清單
                    </span>
                </div>
            </div>
        </div>
    );
}
