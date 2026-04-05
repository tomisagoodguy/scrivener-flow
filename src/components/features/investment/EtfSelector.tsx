'use client';

import { useRouter, useSearchParams } from 'next/navigation';

const ETF_OPTIONS = [
    { code: '00981A', shortCode: '00981', name: '統一台股增長', manager: '統一投信', color: 'bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-700' },
    { code: '00980A', shortCode: '00980', name: '野村智慧優選', manager: '野村投信', color: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700' },
    { code: '00991A', shortCode: '00991', name: '復華未來50', manager: '復華投信', color: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700' },
] as const;

interface EtfSelectorProps {
    currentEtf: string;
}

export function EtfSelector({ currentEtf }: EtfSelectorProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const handleChange = (etfCode: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('etf', etfCode);
        // 切換 ETF 時重置 tab 到預設
        params.delete('tab');
        router.push(`?${params.toString()}`);
    };

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {ETF_OPTIONS.map((etf) => {
                const isActive = currentEtf === etf.code;
                return (
                    <button
                        key={etf.code}
                        onClick={() => handleChange(etf.code)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 ${
                            isActive
                                ? etf.color + ' shadow-sm scale-105'
                                : 'bg-white/60 text-slate-500 border-slate-200 hover:border-slate-300 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700'
                        }`}
                    >
                        {etf.shortCode}
                        <span className="hidden sm:inline ml-1 opacity-80">· {etf.name}</span>
                    </button>
                );
            })}
        </div>
    );
}

export { ETF_OPTIONS };
