'use client';

import { useRouter, useSearchParams } from 'next/navigation';

const WINDOW_OPTIONS = [
    { label: '3 天', value: '3' },
    { label: '5 天', value: '5' },
    { label: '10 天', value: '10' },
];

const MIN_COUNT_OPTIONS = [
    { label: '≥ 2 家', value: '2' },
    { label: '≥ 3 家', value: '3' },
    { label: '≥ 5 家', value: '5' },
];

interface Props {
    currentWindow: number;
    currentMinCount: number;
}

export function MomentumFilter({ currentWindow, currentMinCount }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const handleChange = (key: 'window' | 'min_count', value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set(key, value);
        router.push(`/investment/momentum?${params.toString()}`);
    };

    const buttonClass = (active: boolean) =>
        `px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
            active
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                : 'bg-white/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700/50'
        }`;

    return (
        <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500 dark:text-slate-400">觀察天數：</span>
                {WINDOW_OPTIONS.map((opt) => (
                    <button
                        key={opt.value}
                        onClick={() => handleChange('window', opt.value)}
                        className={buttonClass(currentWindow === parseInt(opt.value, 10))}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
            <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500 dark:text-slate-400">最少家數：</span>
                {MIN_COUNT_OPTIONS.map((opt) => (
                    <button
                        key={opt.value}
                        onClick={() => handleChange('min_count', opt.value)}
                        className={buttonClass(currentMinCount === parseInt(opt.value, 10))}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
