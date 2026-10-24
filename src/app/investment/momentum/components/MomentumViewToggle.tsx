import Link from 'next/link';

export type MomentumView = 'cards' | 'chart';

interface Props {
    currentView: MomentumView;
    windowDays: number;
    minEtfCount: number;
}

/** 卡片 / 圖表視角切換；兩個連結都保留目前的 window 與 min_count */
export function MomentumViewToggle({ currentView, windowDays, minEtfCount }: Props) {
    const base = `/investment/momentum?window=${windowDays}&min_count=${minEtfCount}`;
    const options: { view: MomentumView; label: string; href: string }[] = [
        { view: 'cards', label: '卡片', href: base },
        { view: 'chart', label: '圖表', href: `${base}&view=chart` },
    ];

    return (
        <div className="flex gap-1 bg-gray-100/70 dark:bg-gray-800/50 rounded-xl p-1 w-fit">
            {options.map((opt) => (
                <Link
                    key={opt.view}
                    href={opt.href}
                    className={`text-sm px-3 py-1.5 rounded-lg transition-all ${
                        currentView === opt.view
                            ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm font-medium'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                >
                    {opt.label}
                </Link>
            ))}
        </div>
    );
}
