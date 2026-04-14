'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { WatchlistDrawer } from './WatchlistDrawer';

export function WatchlistButton() {
    const [open, setOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50 transition-colors"
            >
                <Star className="w-4 h-4 fill-amber-400" />
                自選
            </button>
            <WatchlistDrawer open={open} onClose={() => setOpen(false)} />
        </>
    );
}
