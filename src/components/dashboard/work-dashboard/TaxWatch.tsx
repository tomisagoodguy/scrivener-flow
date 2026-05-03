'use client';

import React from 'react';
import { format } from 'date-fns';
import { FileText, Clock, CheckCircle2 } from 'lucide-react';
import { TodoTask } from '@/components/todo/types';

interface TaxWatchProps {
    tasks: TodoTask[];
    onComplete: (taskId: string) => void;
}

export function TaxWatch({ tasks, onComplete }: TaxWatchProps) {
    return (
        <div className="glass-card px-4 py-4 border-slate-200/50 overflow-hidden h-full">
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 text-slate-600 rounded-xl shadow-sm border border-slate-200/50">
                        <FileText className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-base font-black text-slate-800 tracking-tight">稅務監控中心</h2>
                        <p className="text-[9px] text-slate-400 font-bold tracking-[0.2em] uppercase">Tax Filing Monitoring</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-100 shadow-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] font-black text-emerald-700 uppercase">監管中: {tasks.length}</span>
                </div>
            </div>

            <div className="space-y-2">
                {tasks.length === 0 ? (
                    <div className="p-6 text-center border-2 border-dashed border-slate-100 rounded-xl text-slate-400 font-bold flex flex-col items-center gap-2">
                        <CheckCircle2 className="w-8 h-8 text-slate-200" />
                        <span className="text-sm">目前無待處理稅單</span>
                    </div>
                ) : (
                    tasks.map(t => {
                        const isOverdue = new Date(t.date) < new Date();
                        const [caseInfo, rawTaskDetail] = t.title.split(' - ');
                        const taskDetail = rawTaskDetail || '稅務事項';
                        return (
                            <div
                                key={t.id}
                                onClick={() => (window.location.href = `/cases/edit/${t.caseId}`)}
                                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all duration-200 cursor-pointer group/tax ${
                                    isOverdue
                                    ? 'bg-rose-50/30 border-rose-100 hover:bg-rose-50 hover:shadow-md hover:border-rose-200'
                                    : 'bg-slate-50/50 border-slate-100 hover:bg-white hover:shadow-md hover:border-slate-200'
                                }`}
                            >
                                <div className={`p-1.5 rounded-lg border flex-shrink-0 ${
                                    isOverdue ? 'bg-rose-100/50 border-rose-200 text-rose-500' : 'bg-white border-slate-100 text-slate-400'
                                }`}>
                                    <Clock className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center gap-2">
                                        <div className={`font-black text-sm truncate ${isOverdue ? 'text-rose-700' : 'text-slate-800'}`}>
                                            {caseInfo}
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            {isOverdue && (
                                                <span className="text-[10px] font-black px-1.5 py-0.5 bg-rose-500 text-white rounded uppercase animate-pulse">
                                                    已逾期
                                                </span>
                                            )}
                                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase ${
                                                isOverdue ? 'bg-rose-100 text-rose-600' : 'bg-slate-200 text-slate-600'
                                            }`}>
                                                {format(t.date, 'MM/dd')}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={`text-[11px] font-medium truncate ${isOverdue ? 'text-rose-500' : 'text-slate-500'}`}>
                                        {taskDetail}
                                    </div>
                                </div>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onComplete(t.id);
                                    }}
                                    className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all duration-200 flex-shrink-0 ${
                                        isOverdue
                                        ? 'border-rose-200 text-rose-300 hover:bg-rose-500 hover:text-white hover:border-rose-500'
                                        : 'border-slate-100 text-slate-200 hover:bg-emerald-50 hover:text-emerald-500 hover:border-emerald-200'
                                    }`}
                                    title="標記為已完成"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                </button>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
