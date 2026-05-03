'use client';

import React from 'react';
import { format, differenceInDays } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { AlertTriangle, Calendar, CheckCircle2, Archive } from 'lucide-react';
import { TodoTask } from '@/components/todo/types';

interface UrgentAlertsProps {
    tasks: TodoTask[];
    staleCount: number;
    onComplete: (taskId: string) => void;
    onArchiveStale: () => void;
}

export function UrgentAlerts({ tasks, staleCount, onComplete, onArchiveStale }: UrgentAlertsProps) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
        <div className="glass-card px-4 py-4 border-red-100/50 overflow-hidden h-full">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-50 text-red-500 rounded-xl shadow-sm border border-red-100/50">
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-base font-black text-slate-800 tracking-tight">緊急戰情室</h2>
                        <p className="text-[9px] text-slate-400 font-bold tracking-[0.2em] uppercase">
                            Action Required within 72h
                        </p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                    <span className="text-2xl font-black text-red-500/20 tabular-nums leading-none">
                        {String(tasks.length).padStart(2, '0')}
                    </span>
                    {staleCount > 0 && (
                        <button
                            onClick={onArchiveStale}
                            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-slate-400 bg-slate-50 hover:bg-slate-100 hover:text-slate-600 border border-slate-200 rounded-full transition-all duration-200"
                            title={`封存 ${staleCount} 筆逾期超過 5 天的項目`}
                        >
                            <Archive className="w-3 h-3" />
                            封存 {staleCount} 筆舊逾期
                        </button>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                {tasks.length === 0 ? (
                    <div className="p-6 text-center border-2 border-dashed border-slate-100 rounded-xl text-slate-400 font-bold flex flex-col items-center gap-2">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400/50" />
                        <span className="text-sm">目前無緊急事項，一切都在掌控中</span>
                    </div>
                ) : (
                    tasks.map(task => {
                        const diff = differenceInDays(task.date, today);
                        const isOverdue = diff < 0;
                        return (
                            <div key={task.id} className="flex items-center gap-2 px-3 py-2.5 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-red-200/50 transition-all duration-200 group/item">
                                <div className={`w-1 h-6 rounded-full transition-all duration-300 group-hover/item:h-8 flex-shrink-0 ${isOverdue ? 'bg-red-500' : 'bg-orange-400'}`} />

                                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => (window.location.href = `/cases/edit/${task.caseId}`)}>
                                    <div className="flex justify-between items-start gap-2">
                                        <h3 className="font-bold text-slate-800 text-sm leading-tight truncate">{task.title}</h3>
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0
                                            ${isOverdue ? 'bg-red-500 text-white animate-pulse' : 'bg-orange-100 text-orange-600'}
                                        `}>
                                            {isOverdue ? `延遲 ${Math.abs(diff)} 天` : `倒數 ${diff} 天`}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                                            <Calendar className="w-3 h-3 text-slate-300" />
                                            {format(task.date, format(task.date, 'HH:mm') === '00:00' ? 'MM/dd (EEE)' : 'MM/dd (EEE) HH:mm', { locale: zhTW })}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-400 truncate">{task.caseName}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onComplete(task.id);
                                    }}
                                    className="w-7 h-7 rounded-full flex items-center justify-center border border-slate-100 text-slate-200 hover:bg-emerald-50 hover:text-emerald-500 hover:border-emerald-200 transition-all duration-200 flex-shrink-0"
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
