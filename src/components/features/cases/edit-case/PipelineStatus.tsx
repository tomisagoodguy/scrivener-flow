'use client';

import React from 'react';
import { Flag, CheckCircle2, ChevronRight, Edit3, FileText, ClipboardCheck, Truck } from 'lucide-react';
import { getCaseStage } from '@/lib/stageUtils';
import { DemoCase } from '@/types';

interface PipelineStatusProps {
    initialData: DemoCase;
}

export const PipelineStatus: React.FC<PipelineStatusProps> = ({ initialData }) => {
    const currentStage = getCaseStage(initialData);
    const stageOrder = ['contract', 'seal', 'tax', 'transfer', 'handover', 'closed'];
    const currentIdx = stageOrder.indexOf(currentStage);

    const stages = [
        { id: 'contract', label: '簽約', icon: <Edit3 className="w-5 h-5" />, color: 'bg-blue-500' },
        { id: 'seal', label: '用印', icon: <FileText className="w-5 h-5" />, color: 'bg-indigo-500' },
        { id: 'tax', label: '完稅', icon: <ClipboardCheck className="w-5 h-5" />, color: 'bg-emerald-500' },
        { id: 'transfer', label: '過戶', icon: <CheckCircle2 className="w-5 h-5" />, color: 'bg-purple-500' },
        { id: 'handover', label: '交屋', icon: <Truck className="w-5 h-5" />, color: 'bg-red-500' },
    ];

    return (
        <div className="bg-secondary/30 border border-border-color rounded-2xl p-4">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-black text-foreground/60 flex items-center gap-2 tracking-widest uppercase">
                    <Flag className="w-4 h-4 text-primary" /> 案件流程進度 (Pipeline Status)
                </h3>
                <div className="text-[10px] font-black bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20 animate-pulse">
                    AUTO-TRACKING
                </div>
            </div>

            <div className="flex items-center justify-between relative px-2">
                {stages.map((stage, idx) => {
                    const isCompleted = currentIdx > idx;
                    const isCurrent = currentIdx === idx;
                    const isLast = idx === stages.length - 1;

                    return (
                        <React.Fragment key={stage.id}>
                            <div className="flex flex-col items-center shrink-0 z-10 transition-all duration-500">
                                <div
                                    className={`
                                        relative w-12 h-12 rounded-full flex items-center justify-center text-white font-black shadow-lg border-4 transition-all duration-300
                                        ${isCompleted ? stage.color : isCurrent ? `${stage.color} ring-4 ring-primary/20 scale-110` : 'bg-secondary text-foreground/20 border-border-color'}
                                        ${isCurrent ? 'border-white' : 'border-transparent'}
                                    `}
                                >
                                    {isCompleted ? <CheckCircle2 className="w-6 h-6 animate-fade-in" /> : stage.icon}
                                    {isCurrent && (
                                        <div className="absolute -top-1 -right-1 bg-primary w-4 h-4 rounded-full border-2 border-white animate-bounce" />
                                    )}
                                </div>
                                <div className="mt-2 text-center">
                                    <div className={`text-[12px] font-black transition-colors ${isCurrent ? 'text-primary scale-110' : isCompleted ? 'text-foreground' : 'text-foreground/30'}`}>
                                        {stage.label}
                                    </div>
                                </div>
                            </div>

                            {!isLast && (
                                <div className="grow mx-2 relative -mt-6">
                                    <div className="h-1 bg-secondary/50 rounded-full relative">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ${stages[idx].color}`}
                                            style={{ width: isCompleted ? '100%' : '0%' }}
                                        />
                                        <ChevronRight
                                            className={`absolute top-1/2 -translate-y-1/2 right-0 w-4 h-4 ${isCompleted ? 'text-primary' : 'text-foreground/10'
                                                }`}
                                        />
                                    </div>
                                    {stage.id === 'contract' && (
                                        <div className="absolute top-3 w-full flex justify-center pointer-events-none">
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
        </div>
    );
};
