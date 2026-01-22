import React from 'react';
import { isSameDay } from 'date-fns';
import { ProcessedCaseActivity, HoveredMarkerInfo } from './types';
import { GanttMarker } from './GanttMarker';

interface GanttRowProps {
    data: ProcessedCaseActivity;
    days: Date[];
    today: Date;
    setHoveredMarker: (info: HoveredMarkerInfo | null) => void;
}

export function GanttRow({ data, days, today, setHoveredMarker }: GanttRowProps) {
    const rowHeight = Math.max(56, data.maxSlots * 40 + 16);

    return (
        <div className="flex border-b border-gray-50 dark:border-slate-800 hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors group relative overflow-visible">
            {/* Sticky Info Column */}
            <div className="w-48 sticky left-0 z-10 bg-white dark:bg-slate-900 border-r border-gray-100 dark:border-slate-800 p-3 flex flex-col justify-center shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
                <div className="text-[13px] font-black text-slate-800 dark:text-slate-200 group-hover:text-blue-600 transition-colors truncate">
                    {data.caseNumber}
                </div>
                <div className="text-[11px] font-bold text-slate-400 truncate">
                    {data.buyer}
                </div>
            </div>

            {/* Timeline Area */}
            <div className="flex relative items-center" style={{ height: `${rowHeight}px`, isolation: 'auto' }}>
                {/* Grid Lines Background */}
                {days.map((day, idx) => (
                    <div
                        key={idx}
                        className={`
                        w-10 h-full flex-shrink-0 border-r border-gray-50 dark:border-slate-800/50 
                        ${idx % 7 === 0 || idx % 7 === 6 ? 'bg-slate-50/30' : ''}
                        ${isSameDay(day, today) ? 'bg-blue-50/10' : ''}
                    `}
                    />
                ))}

                {/* Activity Markers */}
                {data.activities.map((act: any, aIdx: number) => (
                    <GanttMarker
                        key={aIdx}
                        activity={act}
                        caseNumber={data.caseNumber}
                        today={today}
                        setHoveredMarker={setHoveredMarker}
                    />
                ))}
            </div>
        </div>
    );
}
