import React from 'react';
import { HoveredMarkerInfo } from './types';

interface GanttHeaderProps {
    isCollapsed: boolean;
    setIsCollapsed: (val: boolean) => void;
    showEmpty: boolean;
    setShowEmpty: (val: boolean) => void;
    hoveredMarker: HoveredMarkerInfo | null;
}

export function GanttHeader({
    isCollapsed,
    setIsCollapsed,
    showEmpty,
    setShowEmpty,
    hoveredMarker
}: GanttHeaderProps) {
    return (
        <div className="bg-white/50 dark:bg-slate-900/50 p-5 flex justify-between items-center border-b border-gray-100 dark:border-slate-800 transition-colors select-none">
            <div>
                <div
                    className="flex items-center gap-4 cursor-pointer"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                >
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                        <span className="text-xl">🗓️</span>
                    </div>
                    <div>
                        <h3 className="text-slate-900 dark:text-white font-black text-lg tracking-tight">
                            全景時程監控表 (Pipeline View)
                        </h3>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                            30 Days Outlook • Deadlines & Appointments
                        </p>
                    </div>
                </div>
            </div>

            {/* Info Panel - In Header */}
            <div className="flex-1 max-w-md mx-4">
                <div className="bg-purple-50 border border-purple-200 rounded-lg shadow-sm overflow-hidden h-[70px] flex flex-col">
                    <div className="bg-purple-100 px-3 py-1 border-b border-purple-200 flex-shrink-0">
                        <h3 className="text-[10px] font-black tracking-wide text-purple-900">📍 行程詳情</h3>
                    </div>

                    <div className="flex-1 px-3 py-2 flex items-center justify-center overflow-hidden">
                        {hoveredMarker ? (
                            <div className="w-full flex items-center gap-4">
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <span className="text-sm">🗓️</span>
                                    <span className="text-xs font-black text-slate-800 truncate max-w-[100px]">{hoveredMarker.content}</span>
                                </div>

                                <div className="flex items-center gap-3 text-[10px] flex-1">
                                    <div className="flex items-center gap-1">
                                        <span className="text-slate-500">日期</span>
                                        <span className="font-bold text-slate-800">{hoveredMarker.date}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="text-slate-500">時間</span>
                                        <span className="font-bold text-slate-800">{hoveredMarker.time}</span>
                                    </div>
                                    <div className="flex items-center gap-1 flex-1 min-w-0">
                                        <span className="text-slate-500 flex-shrink-0">案件</span>
                                        <span className="font-bold text-slate-800 truncate">{hoveredMarker.caseNumber}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-slate-400 text-xs">
                                <p className="text-[10px]">👆 移到圖標查看詳情</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowEmpty(!showEmpty);
                    }}
                    className={`text-[10px] px-3 py-1 rounded-full font-black tracking-widest uppercase border transition-all ${showEmpty
                        ? 'bg-blue-50 text-blue-600 border-blue-200 shadow-sm'
                        : 'bg-transparent text-slate-400 border-transparent hover:bg-slate-100'
                        }`}
                    title={showEmpty ? "隱藏無行程的案件" : "顯示所有承辦中案件 (包含無行程)"}
                >
                    {showEmpty ? 'SHOW ALL' : 'ACTIVE ONLY'}
                </button>
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={`text-[10px] px-3 py-1 rounded-full font-black tracking-widest uppercase transition-all ${isCollapsed
                        ? 'bg-slate-100 text-slate-400'
                        : 'bg-purple-50 text-purple-600 border border-purple-100'
                        }`}
                >
                    {isCollapsed ? 'COLLAPSED' : 'EXPANDED'}
                </button>
            </div>
        </div>
    );
}
