'use client';

import { usePathname } from 'next/navigation';

export function MainWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isInvestment = pathname.startsWith('/investment');
    return (
        <main className={`flex-1 ${isInvestment ? '' : 'lg:pl-[108px]'} min-h-screen relative`}>
            {children}
        </main>
    );
}
