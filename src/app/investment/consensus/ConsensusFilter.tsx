'use client';

import { useRouter, useSearchParams } from 'next/navigation';

const OPTIONS = [
    { label: '全部', value: '1' },
    { label: '2+ ETF', value: '2' },
    { label: '3+ ETF', value: '3' },
    { label: '4+ ETF', value: '4' },
];

interface Props {
    current: number;
}

export function ConsensusFilter({ current }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const handleChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('min_etf_count', value);
        router.push(`/investment/consensus?${params.toString()}`);
    };

    return (
        <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-slate-500 dark:text-slate-400 mr-1">篩選：</span>
            {OPTIONS.map((opt) => (
                <button
                    key={opt.value}
                    onClick={() => handleChange(opt.value)}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                        current === parseInt(opt.value)
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                            : 'bg-white/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700/50'
                    }`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}
