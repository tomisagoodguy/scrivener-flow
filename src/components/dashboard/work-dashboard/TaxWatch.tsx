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
        <div className="glass-card p-10 border-slate-200/50 relative overflow-hidden group h-full">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-slate-500/5 rounded-full blur-[80px] group-hover:bg-slate-500/10 transition-colors" />

            <div className="relative z-10 flex justify-between items-start mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-100 text-slate-600 rounded-2xl shadow-sm border border-slate-200/50">
                        <FileText className="w-7 h-7" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                            {tasks.length > 0 ? '稅務監控中心' : '稅務監控中心'}
                        </h2>
                        <p className="text-[10px] text-slate-400 font-bold tracking-[0.2em] uppercase">
                            Tax Filing Monitoring
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
                    tasks.map(t => {
                        const isOverdue = new Date(t.date) < new Date();
                        const [caseInfo, rawTaskDetail] = t.title.split(' - ');
                        
                        // 強制校正 UI 顯示 (確保即使資料庫裡是舊的，顯示出來也是正確的)
                        const taskDetail = rawTaskDetail || '稅務事項';
                        
                        // 我們已經在 systemTaskGenerator 裡把標題組好 (例如: "預計 5/7 報稅")
                        // 這裡不應該強制覆蓋，否則會把其他被歸類為 tax 的任務 (如完稅約定) 標題吃掉
                        // 而且會因為 t.date 的時區問題產生顯示差異

                        return (
                            <div
                                key={t.id}
                                onClick={() => (window.location.href = `/cases/edit/${t.caseId}`)}
                                className={`flex items-center gap-5 p-6 rounded-[24px] border transition-all duration-300 cursor-pointer group/tax ${
                                    isOverdue 
                                    ? 'bg-rose-50/30 border-rose-100 hover:bg-rose-50 hover:shadow-xl hover:border-rose-200' 
                                    : 'bg-slate-50/50 border-slate-100 hover:bg-white hover:shadow-xl hover:border-slate-200'
                                }`}
                            >
                                <div className={`p-2.5 rounded-xl shadow-sm border transition-transform group-hover/tax:scale-110 ${
                                    isOverdue ? 'bg-rose-100/50 border-rose-200 text-rose-500' : 'bg-white border-slate-100 text-slate-400'
                                }`}>
                                    <Clock className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center mb-1">
                                        <div className={`font-black text-lg truncate ${isOverdue ? 'text-rose-700' : 'text-slate-800'}`}>
                                            {caseInfo}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {isOverdue && (
                                                <span className="text-[10px] font-black px-2 py-0.5 bg-rose-500 text-white rounded-md uppercase animate-pulse">
                                                    已逾期
                                                </span>
                                            )}
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase ${
                                                isOverdue ? 'bg-rose-100 text-rose-600' : 'bg-slate-200 text-slate-600'
                                            }`}>
                                                {format(t.date, 'MM/dd')}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={`text-xs font-bold truncate ${isOverdue ? 'text-rose-500' : 'text-slate-500'}`}>
                                        {taskDetail}
                                    </div>
                                </div>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onComplete(t.id);
                                    }}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-300 group/btn ${
                                        isOverdue 
                                        ? 'border-rose-200 text-rose-300 hover:bg-rose-500 hover:text-white hover:border-rose-500' 
                                        : 'border-slate-100 text-slate-200 hover:bg-emerald-50 hover:text-emerald-500 hover:border-emerald-200'
                                    }`}
                                    title="標記為已完成"
                                >
                                    <CheckCircle2 className="w-6 h-6 group-hover/btn:scale-110 transition-transform" />
                                </button>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
