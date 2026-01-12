'use client';

import React, { useState, useEffect } from 'react';

interface HighlightableValueProps {
    value: React.ReactNode;
    caseId: string;
    fieldKey: string; // Unique key suffix for storage
    defaultClassName?: string;
}

export default function HighlightableValue({ value, caseId, fieldKey, defaultClassName = '' }: HighlightableValueProps) {
    const [isHighlighted, setIsHighlighted] = useState(false);

    useEffect(() => {
        const key = `highlight_${caseId}_${fieldKey}`;
        const saved = localStorage.getItem(key);
        if (saved === 'true') {
            setIsHighlighted(true);
        }
    }, [caseId, fieldKey]);

    const toggleHighlight = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const key = `highlight_${caseId}_${fieldKey}`;
        const newState = !isHighlighted;
        setIsHighlighted(newState);
        localStorage.setItem(key, String(newState));
    };

    return (
        <div
            onClick={toggleHighlight}
            className={`
                cursor-pointer transition-colors select-none truncate
                ${isHighlighted
                    ? 'bg-amber-200 text-amber-900 border border-amber-300'
                    : defaultClassName
                }
            `}
        >
            {value}
        </div>
    );
}
