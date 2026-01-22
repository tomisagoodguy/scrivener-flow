import React from 'react';
import { MILESTONES } from './constants';

export function GanttLegend() {
    return (
        <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-800 flex flex-wrap gap-6 text-[10px] font-black uppercase text-slate-400">
            <div className="flex items-center gap-2">
                <span className="text-xs">圖例：</span>
            </div>

            <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-md bg-indigo-500 shadow-sm"></div>
                <span>死線 (Deadline)</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-indigo-100 border-2 border-indigo-300 flex items-center justify-center text-[8px]">🤝</div>
                <span>約定 (Appt)</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-md bg-amber-100 border border-amber-300 flex items-center justify-center">📝</div>
                <span>備忘 (Memo)</span>
            </div>

            <div className="ml-auto flex items-center gap-2">
                <div className="w-px h-4 bg-slate-300 mx-2"></div>
                {MILESTONES.map((m) => (
                    <div key={m.key} className="flex items-center gap-1.5 opacity-70">
                        <div className={`w-2 h-2 rounded-full ${m.color}`}></div>
                        <span>{m.label.replace('日', '')}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
