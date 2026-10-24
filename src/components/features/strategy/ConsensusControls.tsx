import Link from 'next/link';
import { CONSENSUS_MIN_COUNTS, CONSENSUS_WINDOW_DAYS } from '@/lib/investment/strategyConsensusUtils';
import type { ConsensusParams } from '@/lib/investment/strategyConsensusUtils';

const BASE_PATH = '/investment/strategy';

/** 組 URL：省略預設值，參數順序固定為 cmin → cview → cwin */
function buildHref(params: ConsensusParams): string {
    const qs = new URLSearchParams();
    if (params.minCount !== 2) qs.set('cmin', String(params.minCount));
    if (params.view !== 'list') qs.set('cview', params.view);
    if (params.window !== 'latest') qs.set('cwin', String(params.window));
    const query = qs.toString();
    return query ? `${BASE_PATH}?${query}` : BASE_PATH;
}

function optionClass(active: boolean): string {
    return `text-xs px-2 py-1 rounded-md transition-all ${
        active
            ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm font-medium'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
    }`;
}

interface Option {
    label: string;
    patch: Partial<ConsensusParams>;
    active: boolean;
}

function OptionGroup({ options, params }: { options: Option[]; params: ConsensusParams }) {
    return (
        <div className="flex gap-0.5 bg-gray-100/70 dark:bg-gray-800/50 rounded-lg p-0.5">
            {options.map((o) => (
                <Link
                    key={o.label}
                    href={buildHref({ ...params, ...o.patch })}
                    scroll={false}
                    className={optionClass(o.active)}
                >
                    {o.label}
                </Link>
            ))}
        </div>
    );
}

export default function ConsensusControls({ params }: { params: ConsensusParams }) {
    const thresholdOptions: Option[] = CONSENSUS_MIN_COUNTS.map((n) => ({
        label: `≥${n}`,
        patch: { minCount: n },
        active: params.minCount === n,
    }));

    const viewOptions: Option[] = [
        { label: '列表', patch: { view: 'list' }, active: params.view === 'list' },
        { label: '矩陣', patch: { view: 'matrix' }, active: params.view === 'matrix' },
    ];

    const windowOptions: Option[] = [
        { label: '最新', patch: { window: 'latest' }, active: params.window === 'latest' },
        ...CONSENSUS_WINDOW_DAYS.map((d) => ({
            label: `近${d}天`,
            patch: { window: d },
            active: params.window === d,
        })),
    ];

    return (
        <div className="flex flex-wrap items-center gap-2">
            <OptionGroup options={thresholdOptions} params={params} />
            <OptionGroup options={viewOptions} params={params} />
            <OptionGroup options={windowOptions} params={params} />
        </div>
    );
}
