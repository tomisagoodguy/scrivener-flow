'use client';

interface SignalBadgeProps {
    strength: 1 | 2 | 3;
    type?: string;
    compact?: boolean;
}

const STRENGTH_STYLES = {
    1: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    2: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    3: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
} as const;

const STRENGTH_LABELS = {
    1: '弱',
    2: '中',
    3: '強',
} as const;

const TYPE_LABELS: Record<string, string> = {
    multi_fund_consensus: '共識',
    single_fund_overweight: '超配',
    cross_product_accumulation: '積累',
    cross_etf_same_day_buy: '同買',
};

export function SignalBadge({ strength, type, compact = false }: SignalBadgeProps) {
    const style = STRENGTH_STYLES[strength];
    const label = type ? (TYPE_LABELS[type] ?? type) : STRENGTH_LABELS[strength];

    if (compact) {
        return (
            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${style}`}>
                {strength}
            </span>
        );
    }

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${style}`}>
            <span className="font-bold">{strength}</span>
            <span>{label}</span>
        </span>
    );
}
