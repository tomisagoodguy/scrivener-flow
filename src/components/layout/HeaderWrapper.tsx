'use client';

import { usePathname } from 'next/navigation';
import { Suspense } from 'react';
import Header from './Header';

export function HeaderWrapper() {
    const pathname = usePathname();
    if (pathname.startsWith('/investment')) return null;
    return (
        <Suspense fallback={<div className="h-16 w-full animate-pulse bg-slate-100 dark:bg-slate-800" />}>
            <Header />
        </Suspense>
    );
}
