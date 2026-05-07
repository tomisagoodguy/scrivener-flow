'use client';

import type { FactorFilter } from './StockPickerHub.types';

interface FactorFilterChipsProps {
    activeFactors: Set<FactorFilter>;
    selectedEtfsSize: number;
    onToggle: (f: FactorFilter) => void;
    onClear: () => void;
}

const inactive = 'bg-white/60 text-slate-500 border-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700';

const colorMap: Record<string, string> = {
    orange:  'bg-orange-100 text-orange-700 border-orange-400 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-600',
    lime:    'bg-lime-100 text-lime-700 border-lime-400 dark:bg-lime-900/50 dark:text-lime-300 dark:border-lime-600',
    red:     'bg-red-100 text-red-700 border-red-400 dark:bg-red-900/50 dark:text-red-300 dark:border-red-600',
    indigo:  'bg-indigo-100 text-indigo-700 border-indigo-400 dark:bg-indigo-900/50 dark:text-indigo-300 dark:border-indigo-600',
    cyan:    'bg-cyan-100 text-cyan-700 border-cyan-400 dark:bg-cyan-900/50 dark:text-cyan-300 dark:border-cyan-600',
    teal:    'bg-teal-100 text-teal-700 border-teal-400 dark:bg-teal-900/50 dark:text-teal-300 dark:border-teal-600',
    slate:   'bg-slate-200 text-slate-700 border-slate-400 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-500',
    purple:  'bg-purple-100 text-purple-700 border-purple-400 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-600',
    pink:    'bg-pink-100 text-pink-700 border-pink-400 dark:bg-pink-900/50 dark:text-pink-300 dark:border-pink-600',
    emerald: 'bg-emerald-100 text-emerald-700 border-emerald-400 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-600',
    blue:    'bg-blue-100 text-blue-700 border-blue-400 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-600',
    violet:  'bg-violet-100 text-violet-700 border-violet-400 dark:bg-violet-900/50 dark:text-violet-300 dark:border-violet-600',
    amber:   'bg-amber-100 text-amber-700 border-amber-400 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-600',
    yellow:  'bg-yellow-100 text-yellow-700 border-yellow-400 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-600',
    rose:    'bg-rose-100 text-rose-700 border-rose-400 dark:bg-rose-900/50 dark:text-rose-300 dark:border-rose-600',
};

function Chip({
    factorKey,
    label,
    color,
    active,
    onToggle,
}: {
    factorKey: FactorFilter;
    label: string;
    color: string;
    active: boolean;
    onToggle: (f: FactorFilter) => void;
}) {
    return (
        <button
            onClick={() => onToggle(factorKey)}
            className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-all select-none cursor-pointer ${active ? colorMap[color] : inactive}`}
        >
            {active && <span className="mr-1">✓</span>}
            {label}
        </button>
    );
}

export function FactorFilterChips({ activeFactors, selectedEtfsSize, onToggle, onClear }: FactorFilterChipsProps) {
    return (
        <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 w-16 shrink-0">新高</span>
                <Chip factorKey="new_high" label="創5日高" color="orange" active={activeFactors.has('new_high')} onToggle={onToggle} />
                <Chip factorKey="high_20d" label="創20日高" color="lime" active={activeFactors.has('high_20d')} onToggle={onToggle} />
                <Chip factorKey="high_200d" label="創200日高" color="red" active={activeFactors.has('high_200d')} onToggle={onToggle} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 w-16 shrink-0">量化M·T·R</span>
                <Chip factorKey="momentum" label="M 動能正" color="emerald" active={activeFactors.has('momentum')} onToggle={onToggle} />
                <Chip factorKey="it_buy" label="T 投信買超" color="blue" active={activeFactors.has('it_buy')} onToggle={onToggle} />
                <Chip factorKey="rev_new_high" label="R 營收新高" color="violet" active={activeFactors.has('rev_new_high')} onToggle={onToggle} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 w-16 shrink-0">基本</span>
                <Chip factorKey="weight_top10" label="權重前10" color="indigo" active={activeFactors.has('weight_top10')} onToggle={onToggle} />
                <Chip factorKey="amount_top10" label="成交前10" color="cyan" active={activeFactors.has('amount_top10')} onToggle={onToggle} />
                <Chip factorKey="yoy_20" label="YoY>20%" color="teal" active={activeFactors.has('yoy_20')} onToggle={onToggle} />
                <Chip factorKey="low_vol" label="低波動<8%" color="slate" active={activeFactors.has('low_vol')} onToggle={onToggle} />
                <Chip factorKey="margin_high10" label="高資前10" color="purple" active={activeFactors.has('margin_high10')} onToggle={onToggle} />
                <Chip factorKey="margin_low10" label="低資前10" color="pink" active={activeFactors.has('margin_low10')} onToggle={onToggle} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 w-16 shrink-0">進階</span>
                <Chip factorKey="all_shared" label={`${selectedEtfsSize}方共持`} color="amber" active={activeFactors.has('all_shared')} onToggle={onToggle} />
                <Chip factorKey="golden_zone" label="黃金區間" color="yellow" active={activeFactors.has('golden_zone')} onToggle={onToggle} />
                <Chip factorKey="explosive_zone" label="爆發區間" color="rose" active={activeFactors.has('explosive_zone')} onToggle={onToggle} />
                {activeFactors.size > 0 && (
                    <button
                        onClick={onClear}
                        className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline ml-1"
                    >
                        清除
                    </button>
                )}
            </div>
        </div>
    );
}
