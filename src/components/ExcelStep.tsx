'use client';

import React, { useState, useEffect } from 'react';

interface ExcelStepProps {
    label: string;
    date?: string;
    note?: string;
    caseId: string;
}

export default function ExcelStep({ label, date, note, caseId }: ExcelStepProps) {
    const isCompleted = !!date;
    const [isHighlighted, setIsHighlighted] = useState(false);

    useEffect(() => {
        const key = `highlight_${caseId}_${label}`;
        const saved = localStorage.getItem(key);
        if (saved === 'true') {
            setIsHighlighted(true);
        }
    }, [caseId, label]);

    const toggleHighlight = () => {
        const key = `highlight_${caseId}_${label}`;
        const newState = !isHighlighted;
        setIsHighlighted(newState);
        localStorage.setItem(key, String(newState));
    };

    const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' }) : '';

    return (
        <div
            onClick={toggleHighlight}
            className={`
                flex flex-col items-center justify-center flex-1 border-r border-border last:border-r-0 py-0.5 min-w-[40px] h-full cursor-pointer transition-colors select-none
                ${isHighlighted
                    ? 'bg-amber-200 text-amber-900 border-amber-300'
                    : isCompleted
                        ? 'bg-primary/10 text-foreground'
                        : 'bg-secondary/50 text-foreground/40'
                }
            `}
        >
            <span className={`text-[10px] font-black mb-0.5 ${isHighlighted ? 'text-amber-900' : isCompleted ? 'text-primary' : 'text-foreground/40'}`}>
                {label}
            </span>
            <span className={`text-[11px] font-black leading-tight ${isHighlighted ? 'text-amber-950' : isCompleted ? 'text-foreground' : 'text-foreground/20'}`}>
                {isCompleted ? formatDate(date) : '--'}
            </span>
            {note && (
                <div className="text-[9px] font-bold bg-accent text-white px-1 leading-none py-0.5 rounded relative mt-0.5 z-20 shadow animate-pulse truncate max-w-full">
                    {note}
                </div>
            )}
        </div>
    );
}
