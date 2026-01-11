'use client';

import React from 'react';

const QUICK_NOTES = [
    "增值稅重購退稅",
    "房地合一",
    "財交",
    "用印前塗二胎",
    "繼承取得",
    "準備交屋丟水電",
    "過戶完約交屋",
    "等換約換好 丟水電",
    "解約",
    "房地賣重購",
    "房地合一退稅(買方)"
];

interface QuickNotesProps {
    onSelect: (note: string) => void;
}

export default function QuickNotes({ onSelect }: QuickNotesProps) {
    return (
        <div className="flex flex-wrap gap-2 mt-2">
            {QUICK_NOTES.map((note) => (
                <button
                    key={note}
                    type="button"
                    onClick={() => onSelect(note)}
                    className="px-3 py-1 text-xs bg-secondary/50 hover:bg-primary hover:text-white border border-border-color/50 rounded-full transition-all text-foreground/70"
                >
                    + {note}
                </button>
            ))}
        </div>
    );
}
