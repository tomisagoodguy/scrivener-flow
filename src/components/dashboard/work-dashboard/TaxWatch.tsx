'use client';

import React from 'react';
import { format } from 'date-fns';
import { FileText, Clock, CheckCircle2 } from 'lucide-react';
import { TodoTask } from '@/components/todo/types';

interface TaxWatchProps {
    tasks: TodoTask[];
    onComplete: (taskId: string) => void;
}

/**
 * 稅務監控中心
 */
export function TaxWatch({ tasks, onComplete }: TaxWatchProps) {
    return (
        <div className="glass-card p-10 border-slate-200/50 relative overflow-hidden group">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-slate-500/5 rounded-full blur-[80px] group-hover:bg-slate-500/10 transition-colors" />

            <div className="relative z-10 flex justify-between items-start mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-100 text-slate-600 rounded-2xl shadow-sm border border-slate-200/50">
                        <FileText className="w-7 h-7" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                            稅務監控中心
                        </h2>
                        <p className="text-[10px] text-slate-400 font-bold tracking-[0.2em] uppercase">
                            Tax Deadline Monitoring
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-50 border border-emerald-100 shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-black text-emerald-700 uppercase">監管中: {tasks.length}</span>
                </div>
            </div>

            <div className="space-y-4 relative z-10 max-h-[650px] overflow-y-auto pr-2 custom-scrollbar min-h-[400px]">
                {tasks.length === 0 ? (
                    <div className="p-12 text-center border-2 border-dashed border-slate-100 rounded-[24px] text-slate-400 font-bold flex flex-col items-center gap-3">
                        <CheckCircle2 className="w-10 h-10 text-slate-200" />
                        <span>目前無待處理稅單</span>
                    </div>
                ) : (
                    tasks.map(t => (
                        <div
                            key={t.id}
                            onClick={() => (window.location.href = `/cases/edit/${t.caseId}`)}
                            className="flex items-center gap-5 p-6 bg-slate-50/50 rounded-[24px] border border-slate-100 hover:bg-white hover:shadow-xl hover:border-slate-200 transition-all duration-300 cursor-pointer group/tax"
                        >
                            <div className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-100 group-hover/tax:scale-110 transition-transform">
                                <Clock className="w-4 h-4 text-slate-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-1">
                                    <div className="font-black text-slate-800 text-lg truncate">{t.title.split('-')[0]}</div>
                                    <span className="text-[10px] font-black px-2 py-0.5 bg-slate-200 text-slate-600 rounded-md uppercase">
                                        {format(t.date, 'MM/dd')}
                                    </span>
                                </div>
                                <div className="text-xs text-slate-500 font-medium truncate">
                                    {t.title.split('-')[1] || '稅務事項'}
                                </div>
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onComplete(t.id);
                                }}
                                className="w-10 h-10 rounded-full flex items-center justify-center border border-slate-100 text-slate-200 hover:bg-emerald-50 hover:text-emerald-500 hover:border-emerald-200 transition-all duration-300 group/btn"
                                title="標記為已完成"
                            >
                                <CheckCircle2 className="w-6 h-6 group-hover/btn:scale-110 transition-transform" />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
