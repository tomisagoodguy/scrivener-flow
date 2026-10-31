import Link from 'next/link';
import type { StrategyView } from '@/lib/investment/strategyUtils';

interface Tab {
    label: string;
    href: string;
    /** 對應的主視角；null 表示獨立頁，在此永不高亮 */
    view: StrategyView | null;
}

const TABS: Tab[] = [
    { label: '策略視角', href: '/investment/strategy', view: 'strategy' },
    { label: '監控清單', href: '/investment/strategy?view=monitor', view: 'monitor' },
    { label: '圖表', href: '/investment/strategy?view=chart', view: 'chart' },
    { label: '均線發散候選', href: '/investment/strategy/fan-breakout', view: null },
    { label: '換股後表現', href: '/investment/strategy?view=trades', view: 'trades' },
];

const ACTIVE = 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm font-medium';
const INACTIVE = 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200';

/** 策略頁頂部檢視切換列。 */
export default function StrategyViewTabs({ active }: { active: StrategyView }) {
    return (
        <div className="flex gap-1 bg-gray-100/70 dark:bg-gray-800/50 rounded-xl p-1">
            {TABS.map((tab) => (
                <Link
                    key={tab.href}
                    href={tab.href}
                    className={`text-sm px-3 py-1.5 rounded-lg transition-all ${
                        tab.view === active ? ACTIVE : INACTIVE
                    }`}
                >
                    {tab.label}
                </Link>
            ))}
        </div>
    );
}
