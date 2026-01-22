import React, { useRef } from 'react';
import { format, isSameDay } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { HoveredMarkerInfo, ProcessedCaseActivity } from './types';
import { GanttRow } from './GanttRow';

interface GanttGridProps {
    days: Date[];
    today: Date;
    caseActivity: ProcessedCaseActivity[];
    setHoveredMarker: (info: HoveredMarkerInfo | null) => void;
}

export function GanttGrid({ days, today, caseActivity, setHoveredMarker }: GanttGridProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    return (
        <div className="overflow-x-auto overflow-y-auto max-h-[700px] pb-4 scrollbar-hide" ref={scrollContainerRef} style={{ isolation: 'auto' }}>
            <div className="min-w-[1200px] relative" style={{ isolation: 'isolate' }}>
                {/* Header: Dates */}
                <div className="flex sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 shadow-sm">
                    <div className="w-48 sticky left-0 z-30 bg-white dark:bg-slate-900 border-r border-gray-100 dark:border-slate-800 p-3 text-[10px] font-black text-slate-400 uppercase flex items-center justify-center tracking-widest">
                        CASE / TIMELINE
                    </div>
                    {days.map((day, idx) => (
                        <div
                            key={idx}
                            className={`
                        w-10 flex-shrink-0 border-r border-gray-50 dark:border-slate-800 flex flex-col items-center py-2
                        ${idx % 7 === 0 || idx % 7 === 6 ? 'bg-slate-50/50 dark:bg-slate-800/20' : ''}
                        ${isSameDay(day, today) ? 'bg-blue-50/50 border-t-2 border-b-0 border-blue-500' : ''}
                    `}
                        >
                            <span className="text-[9px] font-black text-slate-400 uppercase">
                                {format(day, 'E', { locale: zhTW })}
                            </span>
                            <span
                                className={`text-[13px] font-black ${isSameDay(day, today) ? 'text-blue-600' : 'text-slate-700 dark:text-slate-300'}`}
                            >
                                {format(day, 'd')}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Rows: Cases */}
                {caseActivity.map((c) => (
                    <GanttRow
                        key={c.id}
                        data={c}
                        days={days}
                        today={today}
                        setHoveredMarker={setHoveredMarker}
                    />
                ))}
            </div>
        </div>
    );
}
