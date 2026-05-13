'use client';

import React from 'react';

interface EtfHeaderProps {
    dataDate: string;
    dataSource: 'official_api' | 'pocket';
    today?: Date;
}

function getStaleness(dataDate: string, today: Date): 'fresh' | 'warning' | 'critical' {
    const date = new Date(dataDate);
    const diffMs = today.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 2) return 'fresh';
    if (diffDays <= 5) return 'warning';
    return 'critical';
}

const STALENESS_CLASSES: Record<string, string> = {
    fresh: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    warning: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export function EtfHeader({ dataDate, dataSource, today = new Date() }: EtfHeaderProps) {
    const staleness = getStaleness(dataDate, today);

    return (
        <div className="flex items-center gap-2">
            <span
                data-staleness={staleness}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STALENESS_CLASSES[staleness]}`}
            >
                {dataDate}
            </span>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                {dataSource === 'pocket' ? 'Pocket.tw' : '官方 API'}
            </span>
        </div>
    );
}
