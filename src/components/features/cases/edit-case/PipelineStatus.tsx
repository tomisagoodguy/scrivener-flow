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
        { id: 'contract', label: '簽約', icon: <Edit3 className="w-3.5 h-3.5" />, color: 'bg-blue-500' },
        { id: 'seal', label: '用印', icon: <FileText className="w-3.5 h-3.5" />, color: 'bg-indigo-500' },
        { id: 'tax', label: '完稅', icon: <ClipboardCheck className="w-3.5 h-3.5" />, color: 'bg-emerald-500' },
        { id: 'transfer', label: '過戶', icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: 'bg-purple-500' },
        { id: 'handover', label: '交屋', icon: <Truck className="w-3.5 h-3.5" />, color: 'bg-red-500' },
    ];

    return (
        <div className="bg-secondary/30 border border-border-color rounded-xl p-3">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-black text-foreground/50 flex items-center gap-1.5 tracking-widest uppercase">
                    <Flag className="w-3 h-3 text-primary" /> 全流程進度
                </h3>
                <div className="text-[9px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20 animate-pulse">
                    AUTO-TRACKING
                </div>
            </div>

            <div className="flex items-center justify-between relative px-1">
                {stages.map((stage, idx) => {
                    const isCompleted = currentIdx > idx;
                    const isCurrent = currentIdx === idx;
                    const isLast = idx === stages.length - 1;

                    return (
                        <React.Fragment key={stage.id}>
                            <div className="flex flex-col items-center shrink-0 z-10 transition-all duration-500">
                                <div
                                    className={`
                                        relative w-8 h-8 rounded-full flex items-center justify-center text-white font-black shadow border-2 transition-all duration-300
                                        ${isCompleted ? stage.color : isCurrent ? `${stage.color} ring-2 ring-primary/20 scale-110` : 'bg-secondary text-foreground/20 border-border-color'}
                                        ${isCurrent ? 'border-white' : 'border-transparent'}
                                    `}
                                >
                                    {isCompleted ? <CheckCircle2 className="w-4 h-4 animate-fade-in" /> : stage.icon}
                                    {isCurrent && (
                                        <div className="absolute -top-0.5 -right-0.5 bg-primary w-2.5 h-2.5 rounded-full border border-white animate-bounce" />
                                    )}
                                </div>
                                <div className="mt-1 text-center">
                                    <div className={`text-[10px] font-black transition-colors ${isCurrent ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-foreground/30'}`}>
                                        {stage.label}
                                    </div>
                                </div>
                            </div>

                            {!isLast && (
                                <div className="grow mx-1 relative -mt-4">
                                    <div className="h-0.5 bg-secondary/50 rounded-full relative">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ${stages[idx].color}`}
                                            style={{ width: isCompleted ? '100%' : '0%' }}
                                        />
                                    </div>
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};
