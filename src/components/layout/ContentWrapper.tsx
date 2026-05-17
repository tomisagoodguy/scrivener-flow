'use client';

import { usePathname } from 'next/navigation';

export function ContentWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isInvestment = pathname.startsWith('/investment');

    if (isInvestment) return <>{children}</>;

    return (
        <div className="w-full pr-4 md:pr-8 py-4 md:py-6 animate-fade-in relative z-10">
            {children}
        </div>
    );
}
