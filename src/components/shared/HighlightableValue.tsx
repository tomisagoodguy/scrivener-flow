'use client';

import React from 'react';
import { useLocalStorageFlag } from '@/hooks/useLocalStorageFlag';

interface HighlightableValueProps {
    value: React.ReactNode;
    caseId: string;
    fieldKey: string; // Unique key suffix for storage
    defaultClassName?: string;
}

export default function HighlightableValue({
    value,
    caseId,
    fieldKey,
    defaultClassName = '',
}: HighlightableValueProps) {
    const [isHighlighted, toggle] = useLocalStorageFlag(`highlight_${caseId}_${fieldKey}`);

    const toggleHighlight = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
    };

    return (
        <div
            onClick={toggleHighlight}
            className={`
                cursor-pointer transition-colors select-none truncate
                ${isHighlighted ? 'bg-amber-200 text-amber-900 border border-amber-300' : defaultClassName}
            `}
        >
            {value}
        </div>
    );
}
