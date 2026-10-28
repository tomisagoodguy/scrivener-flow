import Link from 'next/link';
import { equityHref, type EquityChartList } from '@/lib/investment/equityChartUtils';

const LIST_OPTIONS: { label: string; value: EquityChartList }[] = [
    { label: '雙訊號', value: 'double' },
    { label: '主力買進', value: 'big' },
    { label: '散戶減少', value: 'retail' },
];

const ACTIVE = 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm font-medium';
const INACTIVE = 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200';

function Tab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
    return (
        <Link
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`text-sm px-3 py-1.5 rounded-lg transition-all ${active ? ACTIVE : INACTIVE}`}
        >
            {children}
        </Link>
    );
}

/**
 * 籌碼排行「排行 / 圖表」視角切換；圖表視角另顯示三清單切換（附檔數）。
 * baseParams 為要保留的非預設 tier / weeks / sort / dir。
 */
export function EquityViewNav({
    isChart,
    list,
    baseParams,
    counts,
}: {
    isChart: boolean;
    list: EquityChartList;
    baseParams: Record<string, string>;
    counts: Record<EquityChartList, number>;
}) {
    return (
        <div className="flex items-center gap-3 flex-wrap mb-4">
            <div className="flex gap-1 bg-gray-100/70 dark:bg-gray-800/50 rounded-xl p-1">
                <Tab href={equityHref(baseParams)} active={!isChart}>排行</Tab>
                <Tab href={equityHref({ view: 'chart', ...baseParams })} active={isChart}>圖表</Tab>
            </div>
            {isChart && (
                <div className="flex gap-1 bg-gray-100/70 dark:bg-gray-800/50 rounded-xl p-1">
                    {LIST_OPTIONS.map(({ label, value }) => (
                        <Tab key={value} href={equityHref({ view: 'chart', list: value, ...baseParams })} active={list === value}>
                            {label}（{counts[value]}）
                        </Tab>
                    ))}
                </div>
            )}
        </div>
    );
}
