'use client';

import React, { useState } from 'react';
import { TimelineGanttViewProps, HoveredMarkerInfo } from './timeline/types';
import { useTimelineData } from './timeline/useTimelineData';
import { GanttHeader } from './timeline/GanttHeader';
import { GanttGrid } from './timeline/GanttGrid';
import { GanttLegend } from './timeline/GanttLegend';

export default function TimelineGanttView({ cases }: TimelineGanttViewProps) {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [showEmpty, setShowEmpty] = useState(false);
    const [hoveredMarker, setHoveredMarker] = useState<HoveredMarkerInfo | null>(null);

    const { today, days, caseActivity } = useTimelineData(cases, showEmpty);

    if (!showEmpty && caseActivity.length === 0) return null;

    return (
        <div className="bg-card glass-card border-none shadow-xl mb-8 overflow-hidden rounded-3xl animate-fade-in relative">
            <GanttHeader
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
                showEmpty={showEmpty}
                setShowEmpty={setShowEmpty}
                hoveredMarker={hoveredMarker}
            />

            {!isCollapsed && (
                <>
                    <GanttGrid
                        days={days}
                        today={today}
                        caseActivity={caseActivity}
                        setHoveredMarker={setHoveredMarker}
                    />
                    <GanttLegend />
                </>
            )}
        </div>
    );
}
