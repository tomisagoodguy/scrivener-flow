import React from 'react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { TimelineActivity, HoveredMarkerInfo } from './types';

interface GanttMarkerProps {
    activity: TimelineActivity;
    caseNumber: string;
    today: Date;
    setHoveredMarker: (info: HoveredMarkerInfo | null) => void;
}

export function GanttMarker({ activity: act, caseNumber, today, setHoveredMarker }: GanttMarkerProps) {
    const dayOffset = Math.floor(
        (act.date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (dayOffset < 0 || dayOffset > 30) return null;

    // Style based on Shape
    let shapeClass = 'rounded-md'; // Default Square (Milestone)
    if (act.shape === 'circle') shapeClass = 'rounded-full ring-2 ring-white dark:ring-slate-900 shadow-lg';
    if (act.shape === 'pill') shapeClass = 'rounded-full px-1.5 w-auto min-w-[24px]';

    let tooltipTitle = act.content || act.label;
    let tooltipTime = format(act.date, 'HH:mm');
    let tooltipDate = format(act.date, 'MM/dd (E)', { locale: zhTW });

    // Customize based on type
    if (act.isAppointment) {
        tooltipTitle = `${act.content || '約定'}`;
    } else if (act.type.includes('deadline')) {
        tooltipTitle = `${act.content} 期限`;
        tooltipTime = '當日截止';
    }

    return (
        <div
            className="absolute z-20 group/marker transition-all duration-300"
            style={{
                left: `${dayOffset * 40 + 4}px`, // 40px width per day
                top: `${(act.slot || 0) * 40 + 8}px`
            }}
            onMouseEnter={() => {
                setHoveredMarker({
                    content: tooltipTitle,
                    time: tooltipTime,
                    date: tooltipDate,
                    caseNumber: caseNumber
                });
            }}
            onMouseLeave={() => {
                setHoveredMarker(null);
            }}
        >
            <div
                className={`
                    h-8 flex items-center justify-center font-bold text-[10px] transition-all duration-200 cursor-pointer shadow-sm
                    group-hover/marker:scale-110 group-hover/marker:shadow-lg
                    ${act.color}
                    ${shapeClass}
                    ${act.shape === 'square' ? 'w-8 text-white' : ''}
                    ${act.shape === 'circle' ? 'w-8' : ''}
                `}
            >
                {act.label}
            </div>
        </div>
    );
}
