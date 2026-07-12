'use client';

import React from 'react';

interface IdleMascotsProps {
    /** 貓咪 emoji 清單，會依序原地輕搖並交錯延遲，避免動作整齊劃一 */
    emojis: string[];
}

/** 收合時裝飾用的貓咪群（純視覺，不參與互動） */
export default function IdleMascots({ emojis }: IdleMascotsProps) {
    return (
        <span className="inline-flex items-center gap-0.5" aria-hidden="true">
            {emojis.map((emoji, index) => (
                <span
                    key={index}
                    data-testid="idle-mascot"
                    className="text-lg inline-block animate-wiggle select-none"
                    style={{ animationDelay: `${index * 0.3}s` }}
                >
                    {emoji}
                </span>
            ))}
        </span>
    );
}
