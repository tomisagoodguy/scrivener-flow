import Link from 'next/link';
import type { Tier, Weeks } from '@/lib/investment/equityPageData';

const OPTIONS: { label: string; value: Tier | null }[] = [
    { label: '預設', value: null },
    { label: '200張+', value: '200' },
    { label: '400張+', value: '400' },
    { label: '1000張+', value: '1000' },
];

export function TierNav({ tier, weeks }: { tier: Tier | null; weeks?: Weeks }) {
    function href(value: Tier | null): string {
        const params = new URLSearchParams();
        if (value) params.set('tier', value);
        if (weeks && weeks !== 1) params.set('weeks', String(weeks));
        const qs = params.toString();
        return qs ? `?${qs}` : '?';
    }
    return (
        <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-gray-500">同步排序：</span>
            {OPTIONS.map(({ label, value }) => (
                <Link key={label} href={href(value)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${tier === value ? 'bg-violet-500 text-white border-violet-500' : 'bg-white/60 text-gray-600 border-gray-200 hover:border-violet-400 hover:text-violet-600'}`}>
                    {label}
                </Link>
            ))}
        </div>
    );
}
