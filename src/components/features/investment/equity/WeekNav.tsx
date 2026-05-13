import Link from 'next/link';
import type { Tier, Weeks } from '@/lib/investment/equityPageData';

const OPTIONS: { label: string; value: Weeks }[] = [
    { label: '1週', value: 1 },
    { label: '2週', value: 2 },
    { label: '3週', value: 3 },
    { label: '4週', value: 4 },
];

export function WeekNav({
    weeks,
    tier,
    dateRange,
}: {
    weeks: Weeks;
    tier: Tier | null;
    dateRange?: { from: string; to: string };
}) {
    function href(value: Weeks): string {
        const params = new URLSearchParams();
        if (tier) params.set('tier', tier);
        if (value !== 1) params.set('weeks', String(value));
        const qs = params.toString();
        return qs ? `?${qs}` : '?';
    }

    return (
        <div className="flex items-center gap-2 mb-5">
            <span className="text-xs text-gray-500">觀察區間：</span>
            {OPTIONS.map(({ label, value }) => (
                <Link
                    key={value}
                    href={href(value)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                        weeks === value
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-white/60 text-gray-600 border-gray-200 hover:border-amber-400 hover:text-amber-600'
                    }`}
                >
                    {label}
                </Link>
            ))}
            {dateRange && (
                <span className="text-xs text-gray-400 ml-1">
                    {dateRange.from} → {dateRange.to}
                </span>
            )}
        </div>
    );
}
