'use client';

import React from 'react';
import { format, differenceInDays } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { AlertTriangle, Calendar, CheckCircle2, ArrowRight } from 'lucide-react';
import { TodoTask } from '@/components/todo/types';

interface UrgentAlertsProps {
    tasks: TodoTask[];
    onComplete: (taskId: string) => void;
}

/**
 * 緊急戰情室（72小時內緊急事項）
 */
export function UrgentAlerts({ tasks, onComplete }: UrgentAlertsProps) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
        <div className="glass-card p-10 border-red-100/50 relative overflow-hidden group h-full">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-red-500/5 rounded-full blur-[80px] group-hover:bg-red-500/10 transition-colors" />

            <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-50 text-red-500 rounded-2xl shadow-sm border border-red-100/50">
                        <AlertTriangle className="w-7 h-7" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                            緊急戰情室
                        </h2>
                        <p className="text-[10px] text-slate-400 font-bold tracking-[0.2em] uppercase">
                            Action Required within 72h
                        </p>
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-5xl font-black text-red-500/10 tabular-nums leading-none">
                        {String(tasks.length).padStart(2, '0')}
                    </span>
                </div>
            </div>

            <div className="space-y-4 relative z-10 max-h-[650px] overflow-y-auto pr-2 custom-scrollbar min-h-[300px]">
                {tasks.length === 0 ? (
                    <div className="p-12 text-center border-2 border-dashed border-slate-100 rounded-[24px] text-slate-400 font-bold flex flex-col items-center gap-3">
                        <CheckCircle2 className="w-10 h-10 text-emerald-400/50" />
                        <span>目前無緊急事項，一切都在掌控中</span>
                    </div>
                ) : (
                    tasks.map(task => {
                        const diff = differenceInDays(task.date, today);
                        const isOverdue = diff < 0;
                        return (
                            <div key={task.id} className="flex items-center gap-5 p-5 bg-white rounded-[20px] border border-slate-100 shadow-sm hover:shadow-xl hover:border-red-200/50 transition-all duration-300 group/item">
                                {/* Status Indicator */}
                                <div className={`w-1.5 h-12 rounded-full transition-all duration-500 group-hover/item:h-14 ${isOverdue ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]' : 'bg-orange-400'}`}></div>

                                {/* Task Content */}
                                <div className="flex-1 cursor-pointer" onClick={() => (window.location.href = `/cases/edit/${task.caseId}`)}>
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-slate-800 text-lg leading-tight">{task.title}</h3>
                                        <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm
                                            ${isOverdue ? 'bg-red-500 text-white animate-pulse' : 'bg-orange-100 text-orange-600'}
                                        `}>
                                            {isOverdue ? `延遲 ${Math.abs(diff)} 天` : `倒數 ${diff} 天`}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 mt-2">
                                        <span className="text-xs text-slate-400 flex items-center gap-1.5 font-bold">
                                            <Calendar className="w-4 h-4 text-slate-300" />
                                            {format(task.date, format(task.date, 'HH:mm') === '00:00' ? 'yyyy/MM/dd (EEE)' : 'yyyy/MM/dd (EEE) HH:mm', { locale: zhTW })}
                                        </span>
                                        <div className="h-1 w-1 rounded-full bg-slate-200" />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            {task.caseName}
                                        </span>
                                    </div>
                                </div>

                                {/* Completion Action */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onComplete(task.id);
                                    }}
                                    className="w-10 h-10 rounded-full flex items-center justify-center border border-slate-100 text-slate-200 hover:bg-emerald-50 hover:text-emerald-500 hover:border-emerald-200 transition-all duration-300 group/btn"
                                    title="標記為已完成"
                                >
                                    <CheckCircle2 className="w-6 h-6 group-hover/btn:scale-110 transition-transform" />
                                </button>

                                <ArrowRight className="w-5 h-5 text-slate-100 group-hover/item:text-red-400 group-hover/item:translate-x-1 transition-all" />
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    );
}
